window.addEventListener('DOMContentLoaded', () => {
    const callList = document.getElementById('call-list');
    const chartContainer = document.getElementById('chart-container');
    const viewMoreButton = document.getElementById('view-more');

    let allCalls = []; // to store all the fetched calls

    fetch('/databasestuff')
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            allCalls = data; // store all the fetched calls
            const recentCalls = data.slice(0, 5); // display only the first 5 calls

            recentCalls.forEach(call => {
                const callItem = document.createElement('div');
                callItem.classList.add('call-item');
                callItem.innerHTML = `
                    <h3>Call Type: ${call.dispcalltypedescr}</h3>
                    <h3>Call Description: ${call.dispsubtypedescr}</h4>
                    <h4>${call.address}</h3>
                    <h4>Incident Number: ${call.incnum}</h3>
                    <p>Date: ${call.datetimealarm} </p>
                    <h4>Location Name: ${call.sitename}</h4>
                    <p>Narrative: ${call.NARR}</p>
                    <h4>Caller Name: ${call.CALLNAME}</h4>
                    <p>Caller Phone: ${call.CALLPHONE}</p>
                    <p>Caller Address: ${call.CALLADDR}</p>
                `;
                callList.appendChild(callItem);
            });

            if (data.length > 5) {
                viewMoreButton.style.display = 'block'; // display the "View More" button if there are more calls
            }

            viewMoreButton.addEventListener('click', () => {
                const remainingCalls = data.slice(5); // get the remaining calls
                remainingCalls.forEach(call => {
                    const callItem = document.createElement('div');
                    callItem.classList.add('call-item');
                    callItem.innerHTML = `
                        <h3>Call Type: ${call.dispcalltypedescr}</h3>
                        <h3>Call Description: ${call.dispsubtypedescr}</h4>
                        <h4>${call.address}</h3>
                        <h4>Incident Number: ${call.incnum}</h3>
                        <p>Date: ${call.datetimealarm}</p>
                        <h4>Location Name: ${call.sitename}</h4>
                        <p>Narrative: ${call.NARR}</p>
                        <h4>Caller Name: ${call.CALLNAME}</h4>
                        <p>Caller Phone: ${call.CALLPHONE}</p>
                        <p>Caller Address: ${call.CALLADDR}</p>
                    `;
                    callList.appendChild(callItem);
                });

                viewMoreButton.style.display = 'none'; // hide the "View More" button after showing all the calls
            });
        })
        .catch((error) => {
            console.log('Error fetching data:', error);
        });
});

