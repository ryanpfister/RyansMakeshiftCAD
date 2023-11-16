// Requirements
const mysql = require('mysql');
const express = require('express');
const app = express();
const axios = require('axios');
const Push = require('pushover-notifications');
const nocache = require('nocache');

// Express : Start Server
const port = 3000; // Use any port number you prefer
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })


const connection = mysql.createConnection({
    host: '35.203.85.92',
    user: 'caduser',
    password: 'R54WYazowIob6FNhICSzH2',
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

const delayInMinutes = 0.5;
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
                setTimeout(() => {
                    retrieveUpdatedCallData(call);
                }, 5 * 60 * 1000); // Delay in milliseconds (5 minutes)
            } else {
                console.log('Call already found'); 
            }
        });
    });

    // Call the URL to retrieve dispatch narratives
    setTimeout(() => {
        retrieveDispatchNarrative(dispcallidList);
      }, 3 * 60 * 1000);
      
}

function retrieveUpdatedCallData(call) {
    const dispcallid = call.dispcallid;

    // Make a POST request to retrieve the updated call data
    const disppropUrl = 'http://104.167.248.66:8866/dispprop.json.php';
    const disppropData = new URLSearchParams({
        dispcallid: dispcallid,
        nfirsmainid: call.nfirsmainid
    });

    rateLimitedAxios.post(disppropUrl, disppropData)
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
    const query = connection.query('INSERT INTO calls SET ?', callData, (error, results) => {
        if (error) {
            console.error('Error inserting call data:', error);
            return;
        }
        console.log('Call data inserted successfully!');

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
app.use(express.static('public'));

app.get('/callstodate', (req, res) => {
    // Fetch the latest call ID from the database
    connection.query('SELECT MAX(incnum) AS latestCallID FROM calls', (error, results, fields) => {
      if (error) {
        console.error('Error fetching latest call ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      const fullLatestCallID = results[0].latestCallID;

    // Extract the year and remove leading zeros
    const year = fullLatestCallID.substring(0, 4);
    const callNumber = fullLatestCallID.substring(4).replace(/^0+/, '');

    // Return the modified result in JSON format
    res.json({ callNumber });
    });
  });
  
  app.get('/statistics', (req, res) => {
    // Fetch statistics from the database
    connection.query('SELECT COUNT(*) AS totalCalls, SUM(CASE WHEN dispcalltypedescr = "EMS" THEN 1 ELSE 0 END) AS emsCalls FROM calls', (error, results, fields) => {
      if (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      const totalCalls = results[0].totalCalls;
      const emsCalls = results[0].emsCalls;
      const fireCalls = totalCalls - emsCalls;
  
      // Calculate the percentage of fire vs EMS calls
      const percentageFireCalls = Math.round((fireCalls / totalCalls) * 100);
      const percentageEMSCalls = Math.round((emsCalls / totalCalls) * 100);
  
      // Return the statistics in JSON format
      res.json({
        totalCalls,
        emsCalls,
        fireCalls,
        percentageFireCalls,
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