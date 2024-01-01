google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(drawCharts);
let mutualAidsCount = 0;



function drawCharts() {
    const callList = document.getElementById('call-list');
    const chartContainerCalls = document.getElementById('chart-container-calls');
    const chartContainerTime = document.getElementById('chart-container-time');
    const chartContainerLocations = document.getElementById('chart-container-locations');
    const chartContainerDayOfWeek = document.getElementById('chart-container-dayofweek');
    const chartContainerMonthlyTrends = document.getElementById('chart-container-monthlytrends');
    const chartContainerCityDistribution = document.getElementById('chart-container-city');
    const chartContainerMonth = document.getElementById('chart-container-month');
    const chartContainerMutualAids = document.getElementById('chart-container-mutual-aids');

    fetch('/year-in-review')
    .then(response => response.json())
    .then(data => {
        // Update HTML elements with Year in Review data
        document.getElementById('total-calls').innerHTML = `Total Calls in 2023: 2,873`;
        document.getElementById('percentage-fire-calls').innerHTML = `Percentage of Fire Calls: ${data.percentageFireCalls}%`;
    })
    .catch(error => console.error('Error fetching year-in-review data:', error));

    fetch('/databasestuff')
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            const recentCalls = data.slice(0, 10000);
            recentCalls.reverse();

            // Display Call List
            recentCalls.forEach(call => {
                const callItem = document.createElement('div');
                callItem.innerHTML = `
                    <h2>${call.icon} | ${call.dispsubtypedescr}</h1>
                    <h3>Location: ${call.address}, ${call.city}</h3>
                    <p>Narrative: ${call.NARR}</p>
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
                } else if (type === 'EMS') {
                    const emsCalls = recentCalls.filter(call => call.dispcalltypedescr === type || call.dispcalltypedescr !== 'FIRE');
                    return emsCalls.length;
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
                        { text: 'AUTOCRASH', color: 'green' },
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

            //    // Chart 4: Days of the Week
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const callCountsByDayOfWeek = daysOfWeek.map(day => {
                const count = recentCalls.filter(call => new Date(call.datetimealarm).getDay() === daysOfWeek.indexOf(day)).length;
                return count;
            });
            const chartDataDayOfWeek = new google.visualization.DataTable();
            chartDataDayOfWeek.addColumn('string', 'Day of Week');
            chartDataDayOfWeek.addColumn('number', 'Call Count');
            for (let i = 0; i < daysOfWeek.length; i++) {
                chartDataDayOfWeek.addRow([daysOfWeek[i], callCountsByDayOfWeek[i]]);
            }

            const optionsDayOfWeek = {
                title: 'Calls by Day of Week',
                width: '100%',
                height: '600px',
            };
            const chartDayOfWeek = new google.visualization.ColumnChart(chartContainerDayOfWeek);
            chartDayOfWeek.draw(chartDataDayOfWeek, optionsDayOfWeek);

            // Chart 5: Monthly Call Counts
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth(); // 0-indexed
            // Define month names
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
            ];

            // Chart 5: Monthly Call Counts
            const callCountsByMonth = Array.from({ length: 12 }, (_, i) => {
                const monthName = monthNames[i];
                const callsForMonth = recentCalls.filter(call => {
                    const callDate = new Date(call.datetimealarm);
                    const callMonth = callDate.getMonth();
                    const callYear = callDate.getFullYear();

                    // Check if the month has come in the current year
                    if (currentYear === callYear && i === callMonth) {
                        return true;
                    }

                    // If the month hasn't come yet in the current year, consider the previous year
                    if (currentYear - 1 === callYear && i === callMonth) {
                        return true;
                    }

                    return false;
                });

                console.log(`Month: ${monthName}, Calls: ${callsForMonth.length}`);
                return callsForMonth.length;
            });

            const chartDataMonth = new google.visualization.DataTable();
            chartDataMonth.addColumn('string', 'Month');
            chartDataMonth.addColumn('number', 'Call Count');


            for (let i = 0; i < monthNames.length; i++) {
                chartDataMonth.addRow([monthNames[i], callCountsByMonth[i]]);
            }

            const optionsMonth = {
                title: 'Monthly Call Counts',
                width: '100%',
                height: 400,
                vAxis: {
                    minValue: 0
                }
            };

            const chartMonth = new google.visualization.ColumnChart(chartContainerMonth);
            chartMonth.draw(chartDataMonth, optionsMonth);
            // Chart 6: Monthly Call Trends
            const callDates = recentCalls.map(call => new Date(call.datetimealarm));
            const months = Array.from({ length: 12 }, (_, i) => i + 1);

            const NewcallCountsByMonth = months.map(month => {
                const count = callDates.filter(date => date.getMonth() + 1 === month).length;
                return count;
            });

            const chartDataMonthlyTrends = new google.visualization.DataTable();
            chartDataMonthlyTrends.addColumn('string', 'Month');
            chartDataMonthlyTrends.addColumn('number', 'Call Count');
            for (let i = 0; i < months.length; i++) {
                chartDataMonthlyTrends.addRow([months[i].toString(), NewcallCountsByMonth[i]]);
            }

            const optionsMonthlyTrends = {
                title: 'Monthly Call Trends',
                width: '100%',
                height: 400,
            };

            const chartMonthlyTrends = new google.visualization.ColumnChart(chartContainerMonthlyTrends);
            chartMonthlyTrends.draw(chartDataMonthlyTrends, optionsMonthlyTrends);

            // Chart 7: Call Distribution by City
            const cities = recentCalls.reduce((acc, call) => {
                const city = call.city;
                if (acc[city]) {
                    acc[city]++;
                } else {
                    acc[city] = 1;
                }
                return acc;
            }, {});

            const chartDataCityDistribution = new google.visualization.DataTable();
            chartDataCityDistribution.addColumn('string', 'City');
            chartDataCityDistribution.addColumn('number', 'Call Count');
            for (const city in cities) {
                chartDataCityDistribution.addRow([city, cities[city]]);
            }

            const optionsCityDistribution = {
                title: 'Call Distribution by City',
                width: '100%',
                height: 400,
            };

            const chartCityDistribution = new google.visualization.PieChart(chartContainerCityDistribution);
            chartCityDistribution.draw(chartDataCityDistribution, optionsCityDistribution);

            // Mutaul Aids
            const mutualAidsByDepartment = {
                '5-06': 0, // Coram Fire Department
                '5-09': 0, // Gordon Heights Fire Department
                '5-22': 0, // Ridge Fire Department
                '5-30': 0, // Yaphank Fire Department
            };
            // Count mutual aids by department
            recentCalls.forEach(call => {
                if (call.NARR && call.NARR.includes("N/R FOR THIS CALL")) {
                    if (call.NARR.includes("5-22")) {
                        mutualAidsByDepartment['5-22']++;
                    } else if (call.NARR.includes("5-06")) {
                        mutualAidsByDepartment['5-06']++;
                    } else if (call.NARR.includes("5-09")) {
                        mutualAidsByDepartment['5-09']++;
                    } else if (call.NARR.includes("5-30")) {
                        mutualAidsByDepartment['5-30']++;
                    }
                }
            });
            // Prepare data for the chart
            const chartDataMutualAids = new google.visualization.DataTable();
            chartDataMutualAids.addColumn('string', 'Fire Department');
            chartDataMutualAids.addColumn('number', 'Mutual Aids Count');
            // Add data to the chart
            Object.entries(mutualAidsByDepartment).forEach(([department, count]) => {
                chartDataMutualAids.addRow([department, count]);
            });

            // Chart options
            const chartOptionsMutualAids = {
                title: 'Mutual Aids MIFD Was Requested to Respond To',
                width: '100%',
                height: 400,
                legend: 'none', // You can customize the legend if needed
            };

            // Create and draw the chart
            const chartMutualAids = new google.visualization.ColumnChart(chartContainerMutualAids);
            chartMutualAids.draw(chartDataMutualAids, chartOptionsMutualAids);

            Object.entries(mutualAidsByDepartment).forEach(([department, count]) => {
                chartDataMutualAids.addRow([department, count]);
            });


        });
}