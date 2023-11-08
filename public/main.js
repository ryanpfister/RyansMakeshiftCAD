window.addEventListener('DOMContentLoaded', () => {
    const callList = document.getElementById('call-list');

    // Fetch call data from the server
    fetch('/databasestuff')
        .then((response) => {
            console.log(response); // Check the response from the server
            return response.json();
        })
        .then((data) => {
            console.log(data); // Check the data received and ensure it is in valid JSON format

            // Iterate over the array of call data and add each call to the list
            data.forEach(call => {
                // Create a new div element for each call
                let item = document.createElement('DIV');

                // Set the div text content to the call data
                item.textContent = `Call #${call.dispcallid}: ${call.dispcalltypedescr} - ${call.dispsubtypedescr}`;

                // Create a link that will expand/collapse the call data
                let toggleLink = document.createElement('A');
                toggleLink.setAttribute('href', '#');
                toggleLink.textContent = 'Show More';

                toggleLink.onclick = function () {
                    let callData = document.createElement('DIV');
                    console.log('call:', call); // Add this line for debugging
                    callData.textContent = `Time: ${call.time} Address: ${call.address}, ${call.city}, ${call.state}`;
                  
                    // Create a div for the map
                    let mapDiv = document.createElement('DIV');
                    mapDiv.setAttribute('id', 'map');
                  
                    // Set the item to display "flex"
                    item.style.display = 'flex';
                  
                    // If item contains callData, remove it
                    if (item.contains(callData)) {
                      item.removeChild(callData);
                      toggleLink.textContent = 'Show More';
                      // If item contains mapDiv, remove it
                      if (item.contains(mapDiv)) {
                        item.removeChild(mapDiv);
                      }
                    } else { // Else, add it
                      console.log(call)
                      const latitude = parseFloat(call.latitude);
                      const longitude = parseFloat(call.longitude);
                      console.log(latitude)
                      console.log(longitude)
                      const location = { lat: latitude, lng: longitude };
                      let map = new google.maps.Map(mapDiv, {
                        center: location,
                        zoom: 8
                      });
                  
                      // append the map to the item
                      item.appendChild(mapDiv);
                    }
                  };

                // Add the new call to the call list
                item.appendChild(toggleLink);
                callList.appendChild(item);
            });
        })
        .catch((error) => {
            console.error('Error fetching call data:', error);
        });
});

// Call the callback function when the Google Maps API script is loaded