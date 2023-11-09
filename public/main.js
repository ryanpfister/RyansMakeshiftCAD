window.addEventListener('DOMContentLoaded', () => {
    const callList = document.getElementById('call-list');
    const chartContainer = document.getElementById('chart-container');

    fetch('/databasestuff')
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            const recentCalls = data.slice(0, 50);

            recentCalls.forEach(call => {
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

            const addressCount = {};

            recentCalls.forEach(call => {
                const address = call.address;

                if (addressCount.hasOwnProperty(address)) {
                    addressCount[address]++;
                } else {
                    addressCount[address] = 1;
                }
            });

            const sortedAddressCount = Object.entries(addressCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const chartData = {
                labels: sortedAddressCount.map(([address]) => address),
                datasets: [
                    {
                        label: 'Most Visited Addresses',
                        data: sortedAddressCount.map(([address, count]) => count),
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }
                ]
            };

            const chartOptions = {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            };

            const chartCanvas = document.createElement('canvas');
            chartContainer.appendChild(chartCanvas);

            const chartContext = chartCanvas.getContext('2d');
            const chart = new Chart(chartContext, {
                type: 'bar',
                data: chartData,
                options: chartOptions
            });
        })
        .catch((error) => {
            console.log('Error fetching data:', error);
        });
});
