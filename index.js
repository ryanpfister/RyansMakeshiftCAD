// Requirements
const mysql = require('mysql');
const express = require('express');
const app = express();
const axios = require('axios');
const Push = require('pushover-notifications');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const RSS = require('rss');  // Import the rss module



const imapConfig = {
    user: 'mifdcalltracker@gmail.com',
    password: 'edli vgeo uddl clzd',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
        rejectUnauthorized: false
    },
};

// Express : Start Server
const port = 80; // Use any port number you prefer
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})



const connection = mysql.createConnection({
    host: '192.168.111.154',
    user: 'mifd',
    password: 'mifd5150',
    database: 'cad'
});

// Connect to MySQL server
connection.connect((error) => {
    if (error) {
        console.error('Error connecting to MySQL server:', error);
        return;
    }
    console.log('Connected to MySQL server');
    retrieveCallData();
});



function retrieveCallData() {
    console.log("Retrieving call data, line 43.")
    const url = 'http://104.167.248.66:8866/dispcall.json.php';
    const formData = new URLSearchParams({
        persid: 539,
        fdid: 52068
    });

    axios.post(url, formData)
        .then(response => {
            const callData = response.data.dispcall;
            // Process the retrieved call data
            storeNewCalls(callData);
        })

        .catch(error => {
            console.error('Error retrieving call data:', error);
        });
}
// Run the code immediately upon startup

const delayInMinutes = 120;
const delayInMillis = delayInMinutes * 60 * 1000; // Convert minutes to milliseconds

setInterval(retrieveCallData, delayInMillis);

function storeNewCalls(callData) {
    console.log('Checking for New Calls');

    const dispcallidList = [];

    callData.forEach(call => {
        const dispcallid = call.dispcallid;

        // Check if the call exists in the database
        const query = connection.query('SELECT * FROM calls WHERE dispcallid = ?', dispcallid, (error, results) => {
            if (error) {
                console.error('Error querying the database:', error);
                return;
            }

            if (results.length === 0) {
                console.log('Adding new call');
                // Call does not exist in the database, insert it
                insertCallData(call);
            } else {
                console.log('Updating existing call');
                // Call already exists in the database, update it
                updateCallData(call);
            }

            // Add the dispcallid to the list for narrative retrieval
            dispcallidList.push(dispcallid);
        });
    });

    // Call the URL to retrieve dispatch narratives after processing all calls
    setTimeout(() => {
        retrieveDispatchNarrative(dispcallidList);
    }, 3 * 60 * 1000);
}


function updateCallData(call) {
    const dispcallid = call.dispcallid;

    // Make a POST request to retrieve the updated call data
    const disppropUrl = 'http://104.167.248.66:8866/dispprop.json.php';
    const disppropData = new URLSearchParams({
        dispcallid: dispcallid,
        nfirsmainid: call.nfirsmainid
    });

    axios.post(disppropUrl, disppropData)
        .then(response => {
            const updatedCallData = response.data.dispprop.data.dispcall;
            const updatedNarrative = updatedCallData.NARR;
            const updatedCallPhone = updatedCallData.CALLPHONE;
            const updatedCallAddr = updatedCallData.CALLADDR;
            const updatedCallName = updatedCallData.CALLNAME;
            // Update the stored call entry in the database with the updated data
            const updateQuery = connection.query('UPDATE calls SET NARR = ?, CALLPHONE = ?, CALLADDR = ?, CALLNAME = ? WHERE dispcallid = ?', [updatedNarrative, updatedCallPhone, updatedCallAddr, updatedCallName, dispcallid], (updateError, updateResults) => {
                if (updateError) {
                    console.error('Error updating call data:', updateError);
                    return;
                }
                console.log('Call data updated successfully');
            });
        })
        .catch(error => {
            console.error('Error retrieving updated call data:', error);
        });
}
function insertCallData(callData) {
    // Convert datetime value to the correct format
    const datetimeAlarm = new Date(callData.datetimealarm).toISOString().slice(0, 19).replace('T', ' ');
    callData.datetimealarm = datetimeAlarm;

    const query = connection.query('INSERT INTO calls SET ? ON DUPLICATE KEY UPDATE NARR = VALUES(NARR), CALLPHONE = VALUES(CALLPHONE), CALLADDR = VALUES(CALLADDR), CALLNAME = VALUES(CALLNAME)', callData, (error, results) => {
        if (error) {
            console.error('Error inserting or updating call data:', error);
            return;
        }
        console.log('Call data inserted or updated successfully!');

        setTimeout(() => {
            retrieveDispatchNarrative(callData);
        }, 180000);
    });
}


function fixMissingCallData(callData) {
    const dispcallid = callData.dispcallid;
    const nfirsmainid = callData.nfirsmainid;

    // Verify if the call data is missing necessary information
    if (!callData.NARR || !callData.CALLPHONE || !callData.CALLADDR || !callData.CALLNAME) {
        // Make a POST request to retrieve the missing information
        const disppropUrl = 'http://104.167.248.66:8866/dispprop.json.php';
        const disppropData = new URLSearchParams({
            dispcallid: dispcallid,
            nfirsmainid: nfirsmainid
        });
        console.log(`POST LOG: ${disppropUrl} | ${disppropData}`)

        axios.post(disppropUrl, disppropData)
            .then(response => {
                const dispatchData = response.data.dispprop.data.dispcall;
                const narrative = dispatchData.NARR || callData.NARR;
                const callPhone = dispatchData.CALLPHONE || callData.CALLPHONE;
                const callAddr = dispatchData.CALLADDR || callData.CALLADDR;
                const callName = dispatchData.CALLNAME || callData.CALLNAME;

                const updateQuery = connection.query('UPDATE calls SET NARR = ?, CALLPHONE = ?, CALLADDR = ?, CALLNAME = ? WHERE dispcallid = ?', [narrative, callPhone, callAddr, callName, dispcallid], (updateError, updateResults) => {
                    if (updateError) {
                        console.error('Error updating call:', updateError);
                        return;
                    }

                    console.log('Call updated successfully.');

                });
            })
    }
}

function retrieveDispatchNarrative(dispcallidList) {

    const processedIds = new Set();

    const query = connection.query('SELECT dispcallid, nfirsmainid, NARR, CALLPHONE, CALLADDR, CALLNAME FROM calls', (error, results) => {
        if (error) {
            console.error('Error retrieving stored calls:', error);
            return;
        }

        const batchRequest = [];

        results.forEach(call => {
            const dispcallid = call.dispcallid;
            const nfirsmainid = call.nfirsmainid;
            const narrative = call.NARR;
            const callPhone = call.CALLPHONE;
            const callAddr = call.CALLADDR;
            const callName = call.CALLNAME;
            if (processedIds.has(dispcallid)) {
                return;
            }
            processedIds.add(dispcallid);


            // Add the dispcallid and nfirsmainid to the batch request array
            batchRequest.push({ dispcallid, nfirsmainid });

        });

        // Make a single POST request to retrieve dispatch narratives for multiple calls
        const disppropUrl = 'http://104.167.248.66:8866/dispprop.json.php';
        const disppropData = batchRequest.map(call => new URLSearchParams(call));

        axios.all(disppropData.map(data => axios.post(disppropUrl, data)))
            .then(axios.spread((...responses) => {
                responses.forEach((response, index) => {
                    const dispatchData = response.data.dispprop.data.dispcall;
                    const narrative = dispatchData.NARR;
                    const callPhone = dispatchData.CALLPHONE;
                    const callAddr = dispatchData.CALLADDR;
                    const callName = dispatchData.CALLNAME;

                    const dispcallid = batchRequest[index].dispcallid;

                    // Update the stored call entry in the database with the dispatch narrative and additional fields
                    const updateQuery = connection.query('UPDATE calls SET NARR = ?, CALLPHONE = ?, CALLADDR = ?, CALLNAME = ? WHERE dispcallid = ?', [narrative, callPhone, callAddr, callName, dispcallid], (updateError, updateResults) => {
                        if (updateError) {
                            console.error('Error updating stored call:', updateError);
                            return;
                        }

                        console.log('Stored call updated successfully.');
                    });
                });
            }))
            .catch(error => {
                console.error('Error retrieving dispatch narratives:', error);
            });
    });
}
app.use('/afjasdpfapewf', express.static('public'));

app.get('/force-update-calls', (req, res) => {
    retrieveCallData();
    res.json({ message: 'Force update initiated.' });
});
app.get('/callstodate', (req, res) => {
    // Fetch the latest call ID from the database
    connection.query('SELECT MAX(incnum) AS latestCallID FROM calls', (error, results, fields) => {
        if (error) {
            console.error('Error fetching latest call ID:', error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const fullLatestCallID = results[0] && results[0].latestCallID;

        let callNumber;  // Define callNumber here

        // Ensure fullLatestCallID is a string before using substring
        if (typeof fullLatestCallID === 'number') {
            // Convert number to string
            const fullLatestCallIDString = fullLatestCallID.toString();

            // Extract the year and remove leading zeros
            const year = fullLatestCallIDString.substring(0, 4);

            // Ensure there is a substring to operate on
            if (fullLatestCallIDString.length >= 5) {
                // Assign value to callNumber
                callNumber = fullLatestCallIDString.substring(4).replace(/^0+/, '');
                // Rest of your code handling the values
            } else {
                console.error('Error: fullLatestCallID is too short to extract callNumber');
            }
        } else {
            console.error(`Error: fullLatestCallID is not a string, type: ${typeof fullLatestCallID}`);
            console.log('Full latestCallID:', fullLatestCallID);
        }

        // Now you can use callNumber here or in the subsequent code



        // Return the modified result in JSON format
        res.json({ callNumber });
    });
});



app.get('/firestatistics', (req, res) => {
    const currentYear = new Date().getFullYear();
    console.log(currentYear)
    // Fetch statistics for the current year from the database
    connection.query('SELECT COUNT(*) AS totalCalls, ' +
        'SUM(CASE WHEN icon = "EMS" THEN 1 ELSE 0 END) AS emsCalls, ' +
        'SUM(CASE WHEN icon = "FIRE" OR icon = "CARFIRE" THEN 1 ELSE 0 END) AS fireCalls ' +
        'FROM calls WHERE YEAR(datetimealarm) = YEAR(CURDATE())', (error, results, fields) => {
            if (error) {
                console.error('Error fetching statistics:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const totalCalls = results[0].totalCalls || 0;
            const emsCalls = results[0].emsCalls || 0;
            const fireCalls = results[0].fireCalls || 0;

            // Calculate the percentage of fire vs EMS calls
            const percentageFireCalls = totalCalls > 0 ? Math.round((fireCalls / totalCalls) * 100) : 0;

            // Return the statistics in JSON format
            res.json({
                totalCalls,
                emsCalls,
                fireCalls,
                percentageFireCalls
            });
        });
});


app.get('/emsstatistics', (req, res) => {
    const currentYear = new Date().getFullYear();

    // Fetch statistics for the current year from the database
    connection.query('SELECT COUNT(*) AS totalCalls, SUM(CASE WHEN icon = "EMS" OR icon = "AUTOCRASH" THEN 1 ELSE 0 END) AS emsCalls FROM calls WHERE YEAR(datetimealarm) = YEAR(CURDATE())', (error, results, fields) => {
        if (error) {
            console.error('Error fetching statistics:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        const totalCalls = results[0].totalCalls || 0;
        const emsCalls = results[0].emsCalls || 0;

        // Calculate the percentage of fire vs EMS calls
        const percentageEMSCalls = totalCalls > 0 ? Math.round((emsCalls / totalCalls) * 100) : 0;

        // Return the statistics in JSON format
        res.json({
            totalCalls,
            emsCalls,
            percentageEMSCalls
        });
    });
});
app.get('/databasestuff', (req, res) => {
    const query = connection.query('SELECT * FROM calls', (error, results) => {
        if (error) {
            console.error('Error querying the database:', error);
            return;
        }
        return res.send(JSON.stringify(results));
    });
});

app.get('/year-in-review', (req, res) => {
    const previousYear = new Date().getFullYear() - 1;

    // Fetch the highest incident number for the previous year
    connection.query(
        'SELECT MAX(incnum) AS highestIncidentNumber FROM calls WHERE YEAR(datetimealarm) = ?',
        [previousYear],
        (error, results) => {
            if (error) {
                console.error('Error fetching highest incident number:', error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const highestIncidentNumber = results[0].highestIncidentNumber || 0; // Default to 0 if no data

            // Fetch other statistics for the previous year
            connection.query(
                'SELECT COUNT(*) AS totalCalls, SUM(CASE WHEN dispcalltypedescr = "EMS" THEN 1 ELSE 0 END) AS emsCalls FROM calls WHERE YEAR(datetimealarm) = ?',
                [previousYear],
                (statsError, statsResults) => {
                    if (statsError) {
                        console.error('Error fetching year-in-review statistics:', statsError);
                        res.status(500).json({ error: 'Internal Server Error' });
                        return;
                    }

                    const totalCalls = statsResults[0].totalCalls;
                    const emsCalls = statsResults[0].emsCalls;
                    const fireCalls = totalCalls - emsCalls;
                    const percentageFireCalls = Math.round((fireCalls / totalCalls) * 100);

                    // Return the statistics in JSON format
                    res.json({
                        highestIncidentNumber,
                        totalCalls,
                        emsCalls,
                        fireCalls,
                        percentageFireCalls
                    });
                }
            );
        }
    );
});
app.get('/rssfeed', function (req, res, next) {

});

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8888');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Expires', '0');
    res.setHeader('Pragma', 'no-cache');
    // Pass to next layer of middleware
    next();
});

const specificEmail = ['mifdradio@middleislandfd.org', 'mifd413@gmail.com']; // Replace with the desired email address

const getEmails = () => {
    try {
        const imap = new Imap(imapConfig);

        imap.once('ready', () => {
            imap.openBox('INBOX', false, () => {
                imap.search(['UNSEEN', ['SINCE', new Date()]], (err, results) => {
                    if (err) {
                        console.error('Error searching for unseen messages:', err);
                        return;
                    }

                    if (results.length === 0) {
                        console.log('No new messages to fetch.');
                        imap.end();
                        return;
                    }

                    const f = imap.fetch(results, { bodies: '' });

                    f.on('message', msg => {
                        msg.on('body', stream => {
                            simpleParser(stream, async (err, parsed) => {
                                console.log(parsed);

                                // Check if the email is from a specific address
                                const senderEmail = parsed.from.text.toLowerCase();
                                if (specificEmail.some(specificEmail => senderEmail.includes(specificEmail.toLowerCase()))) {
                                    // Update the RSS data to 1 when a new email is received from the specific address
                                    rssData.value = 1;
                                    // Reset the countdown for the RSS data
                                    resetCountdown();
                                }

                                // Your logic to save the data into a database or make API calls
                            });
                        });

                        msg.once('attributes', attrs => {
                            const { uid } = attrs;
                            imap.addFlags(uid, ['\\Seen'], () => {
                                console.log('Marked as read!');
                            });
                        });
                    });

                    f.once('error', ex => {
                        console.error('Error fetching messages:', ex);
                        imap.end();
                    });

                    f.once('end', () => {
                        console.log('Done fetching all messages!');
                        imap.end();
                    });
                });
            });
        });

        imap.once('error', err => {
            console.error('IMAP connection error:', err);
        });

        imap.once('end', () => {
            console.log('Connection ended');
        });

        imap.connect();
    } catch (ex) {
        console.error('An error occurred:', ex);
    }
};


// Run the getEmails function immediately and then every 10 seconds
getEmails(); // Run immediately
setInterval(getEmails, 10000); // Run every 10 seconds (10000 milliseconds)


// RSS
let rssData = {
    value: 0,
    countdown: null,
};

const startCountdown = () => {
    rssData.countdown = setTimeout(() => {
        rssData.value = 0;
        console.log('Countdown finished. Resetting value to 0.');
    }, 20 * 60 * 1000); // 20 minutes in milliseconds
};

const resetCountdown = () => {
    clearTimeout(rssData.countdown);
    startCountdown();
};

// Your route for handling incoming emails
app.post('/incoming-email', (req, res) => {
    // Assuming the email data is in the request body
    const emailData = req.body;

    // Your logic to process the email data
    console.log('Received email:', emailData);

    // Set the RSS data to 1
    rssData.value = 1;

    // Reset the countdown
    resetCountdown();

    res.status(200).json({ message: 'Email processed successfully.' });
});

// Route to get the current RSS data
app.get('/rss-data', (req, res) => {
    res.status(200).json({ value: rssData.value });
});

app.get('/rss-sign', (req, res) => {
    const feed = new RSS({
        title: 'Feed',
        feed_url: 'https://cad.rdpconsulting.org.org/rss-sign', // Update with your actual feed URL
        site_url: 'https://cad.rdpconsulting.org.org/', // Update with your actual site URL
    });

    feed.item({
        title: 'Sign Value',
        description: rssData.value.toString(),
        date: new Date(), // Add the current date here
    });

    const xml = feed.xml();

    // Remove extra line breaks and indentation
    const cleanXml = xml.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');

    res.type('xml').send(cleanXml);
});

// Call Statistics Feed
const feed = new RSS({
    title: 'Call Statistics RSS Feed',
    description: 'Updates on call statistics.',
    feed_url: 'http://cad.rdpconsulting.org/callrss', // Replace with your actual domain
    site_url: 'http://middleislandfd.com', // Replace with your actual domain
  });


// Function to fetch call statistics from the database for the current year
function fetchCallStatistics() {
    return new Promise((resolve, reject) => {
        // Get the current year
        const currentYear = new Date().getFullYear();

        // Query to fetch statistics for the current year from the database
        const query = `
        SELECT
            COUNT(*) AS totalCalls,
            SUM(CASE WHEN icon = "EMS" THEN 1 ELSE 0 END) AS emsCalls,
            SUM(CASE WHEN icon = "FIRE" OR icon = "CARFIRE" THEN 1 ELSE 0 END) AS fireCalls
        FROM calls
        WHERE YEAR(datetimealarm) = ?
        `;

        // Execute the query
        connection.query(query, [currentYear], (error, results, fields) => {
            if (error) {
                console.error('Error fetching statistics:', error);
                reject({ error: 'Internal Server Error' });
                return;
            }

            // Extract statistics from the results
            const totalCalls = results[0].totalCalls || 0;
            const emsCalls = results[0].emsCalls || 0;
            const fireCalls = results[0].fireCalls || 0;

            // Calculate the percentage of fire vs EMS calls
            const percentageFireCalls = totalCalls > 0 ? Math.round((fireCalls / totalCalls) * 100) : 0;

            // Return the statistics in JSON format
            const statistics = {
                totalCalls,
                emsCalls,
                fireCalls,
                percentageFireCalls,
            };

            resolve(statistics);
        });
    });
}


app.get('/callrss', async (req, res) => {
    try {
        // Fetch your call statistics data from the database
        const statistics = await fetchCallStatistics();

        // Send the feed as XML

        const feed = new RSS({
            title: 'Feed',
            feed_url: 'https://cad.rdpconsulting.org.org/rss-feed',
            site_url: 'https://cad.rdpconsulting.org.org/',
        });
    
        feed.item({
            title: 'Calls',
            description: `Total Calls: ${statistics.totalCalls}, EMS Calls: ${statistics.emsCalls}, Fire Calls: ${statistics.fireCalls}`,
            date: new Date(), // Add the current date here
        });
    
        const xml = feed.xml();
    
        res.type('xml').send(xml);
    } catch (error) {
        console.error('Error:', error);
        // Handle the error
        res.status(500).send('Internal Server Error');
    }
});
  
  // Example usage of the fetchCallStatistics function
  app.get('/fetch-call-statistics', (req, res) => {
    fetchCallStatistics((error, statistics) => {
      if (error) {
        return res.status(500).json({ error });
      }
      res.json(statistics);
    });
  });
  