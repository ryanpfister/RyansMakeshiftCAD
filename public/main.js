google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(drawCharts);

function drawCharts() {
    const callList = document.getElementById('call-list');
    const chartContainerCalls = document.getElementById('chart-container-calls');
    const chartContainerTime = document.getElementById('chart-container-time');
    const chartContainerLocations = document.getElementById('chart-container-locations');
    const chartContainerMap = document.getElementById('chart-container-map');


    fetch('/databasestuff')
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            const recentCalls = data.slice(0,10000);
            recentCalls.reverse();

            // Display Call List
            recentCalls.forEach(call => {
                const callItem = document.createElement('div');
                callItem.innerHTML = `
                    <h2>${call.icon} | ${call.dispsubtypedescr}</h1>
                    <h3>Location: ${call.address}, ${call.city}</h3>
                    <p><b>Narrative:</b> ${call.NARR}</p>

                    <p>Date/Time: ${call.datetimealarm}</p>
                    <p>Incident Number: ${call.incnum}</p>
                                    `;
                callItem.classList.add('call-item');
                callList.appendChild(callItem);
            });
            // Chart 1: Call Types
            const callTypes = ['EMS', 'FIRE'];

            const callCounts = callTypes.map((type) => {
                if (type === 'FIRE') {
                    const fireCalls = recentCalls.filter(call => call.dispcalltypedescr === type || call.dispcalltypedescr !== 'EMS');
                    return fireCalls.length;
                } else {
                    const callsOfType = recentCalls.filter(call => call.dispcalltypedescr === type);
                    return callsOfType.length;
                }
            });

            const chartDataCalls = new google.visualization.DataTable();
            chartDataCalls.addColumn('string', 'Call Type');
            chartDataCalls.addColumn('number', 'Call Count');
            for (let i = 0; i < callTypes.length; i++) {
                chartDataCalls.addRow([callTypes[i], callCounts[i]]);
            }

            const chartOptionsCalls = {
                title: 'Call Types',
                width: '100%',
                height: 400,
                legend: {
                    position: 'top',
                    textStyle: {
                        color: 'black',
                        fontSize: 14,
                    },
                    // Specify custom legend items
                    items: [
                        { text: 'FIRE', color: 'red' },
                        { text: 'EMS', color: 'blue' },
                    ],
                },
            };

            const chartCalls = new google.visualization.ColumnChart(chartContainerCalls);
            chartCalls.draw(chartDataCalls, chartOptionsCalls);

            // Chart 2: Time of Day
            const callTimes = recentCalls.map(call => new Date(call.datetimealarm).getHours());
            const hoursOfDay = Array.from({ length: 12 }, (_, i) => i * 2);

            const callCountsByHour = hoursOfDay.map(hour => {
                const count = callTimes.filter(time => time >= hour && time < hour + 2).length;
                return count;
            });

            const chartDataTime = new google.visualization.DataTable();
            chartDataTime.addColumn('string', 'Time of Day');
            chartDataTime.addColumn('number', 'Call Count');
            for (let i = 0; i < hoursOfDay.length; i++) {
                const labelHour = `${hoursOfDay[i]}:00 - ${hoursOfDay[i] + 3}:00`;
                chartDataTime.addRow([labelHour, callCountsByHour[i]]);
            }

            const optionsTime = {
                title: 'Calls by Time of Day',
                width: '100%',
                height: '600px',
            };

            const chartTime = new google.visualization.ColumnChart(chartContainerTime);
            chartTime.draw(chartDataTime, optionsTime);

            // Chart 3: Most Visited Locations
            const locations = recentCalls.reduce((acc, call) => {
                const location = `${call.address}, ${call.city}`;
                if (acc[location]) {
                    acc[location]++;
                } else {
                    acc[location] = 1;
                }
                return acc;
            }, {});

            const sortedLocations = Object.entries(locations).sort((a, b) => b[1] - a[1]);
            const topLocations = sortedLocations.slice(0, 5);

            const chartDataLocations = new google.visualization.DataTable();
            chartDataLocations.addColumn('string', 'Location');
            chartDataLocations.addColumn('number', 'Call Count');
            for (let i = 0; i < topLocations.length; i++) {
                chartDataLocations.addRow([topLocations[i][0], topLocations[i][1]]);
            }
            const chartOptionsLocations = {
                title: 'Most Visited Locations',
                width: '100%',
                height: 400,
                legend: 'none',
            };

            const chartLocations = new google.visualization.BarChart(chartContainerLocations);
            chartLocations.draw(chartDataLocations, chartOptionsLocations);
        });

    // Initialize Google Map for displaying call locations
    const map = new google.maps.Map(chartContainerMap, {
        center: { lat: 0, lng: 0 },
        zoom: 12,
    });

    // Display markers for each call's location
    recentCalls.forEach(call => {
        const location = `${call.address}, ${call.city}`;

        // Use geocoding to convert address to geographic coordinates (latitude and longitude)
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: location }, (results, status) => {
            if (status === 'OK') {
                const marker = new google.maps.Marker({
                    map: map,
                    position: results[0].geometry.location,
                    title: call.dispsubtypedescr,
                });

                // Show call details when marker is clicked
                // Show call details when marker is clicked
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <h2>${call.icon} | ${call.dispsubtypedescr}</h2>
          <h3>Location: ${call.address}, ${call.city}</h3>
          <p><b>Narrative:</b> ${call.NARR}</p>
          <p>Date/Time: ${call.datetimealarm}</p>
          <p>Incident Number ${call.incnum}</p>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    }
  });
});
}