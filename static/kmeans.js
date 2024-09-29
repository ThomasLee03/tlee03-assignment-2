// Select DOM elements
const initMethod = document.getElementById('initMethod');
const numCentroidsInput = document.getElementById('numCentroids');
const generateBtn = document.getElementById('generateBtn');
const initializeBtn = document.getElementById('initializeBtn');
const stepBtn = document.getElementById('stepBtn');
const convergeBtn = document.getElementById('convergeBtn');
const resetBtn = document.getElementById('resetBtn');

const plotDiv = document.getElementById('plot');

let data = [];
let centroids = [];
let clusters = {};
let currentStep = 0;
let manualMode = false;
const plotWidth = 500; // Width of the plot
const plotHeight = 500; // Height of the plot
const clusterColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']; // Colors for clusters




// Generate a random dataset
generateBtn.addEventListener('click', () => {
    fetch('/generate', {
        method: 'POST',
        body: JSON.stringify({ numPoints: 200 }),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(dataset => {
            data = dataset;
            clusters = {};  // Reset clusters
            centroids = []; // Reset centroids
            currentStep = 0;
            plotData(); // Plot the new dataset
        });
});

// In your initialization function:
initializeBtn.addEventListener('click', () => {
    // Check if the dataset is populated
    if (data.length === 0) {
        alert("Please generate a dataset first.");
        return;
    }

    const method = initMethod.value;
    const numCentroids = parseInt(numCentroidsInput.value);

    // Always reset centroids and clusters when switching methods
    centroids = [];  // Clear the centroids for all methods
    clusters = {};   // Clear clusters
    manualMode = false;  // Turn off manual mode initially
    console.log(`Before initialization: centroids = ${JSON.stringify(centroids)}`);

    if (method === 'manual') {
        // Manual mode activated
        manualMode = true;
        centroids = [];  // Ensure centroids are cleared before entering manual mode
        console.log(`After reset for manual method: centroids = ${JSON.stringify(centroids)}`);

        // Send the reset flag to backend to clear past centroids
        fetch('/manual_centroid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset: true })  // Send reset flag
        }).then(() => {
            plotData();  // Clear the plot
            alert('Click on the plot to manually place centroids.');
        });
    } else {
        // Handle other initialization methods (Random, Farthest First, KMeans++)
        fetch('/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: method, numCentroids: numCentroids })
        })
        .then(response => response.json())
        .then(newCentroids => {
            centroids = newCentroids;  // Set the new centroids
            plotData();                // Plot the new centroids
        });
    }
});





// Handle click event for manual centroid selection
plotDiv.addEventListener('click', (event) => {
    console.log("Click event detected on plotDiv");
    console.log(`Centroids before click: ${JSON.stringify(centroids)}`);

    if (manualMode && centroids.length < parseInt(numCentroidsInput.value)) {
        const x = event.offsetX;
        const y = event.offsetY;

        // Avoid adding duplicate centroids at the same location
        const isDuplicate = centroids.some(c => c.x === x && c.y === y);
        if (!isDuplicate) {
            let newCentroid = { x: x, y: y };
            centroids.push(newCentroid);
            console.log(`Centroids before fetch: ${JSON.stringify(centroids)}`);
            // Send the new centroid to the backend
            fetch('/manual_centroid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ point: newCentroid })
            })
                .then(response => response.json())
                .then(result => {
                    centroids = result.centroids;  // Update centroids from the backend response
                    console.log(`Centroids after click: ${JSON.stringify(centroids)}`);
                    plotData();  // Plot the new centroid
                    if (result.manualComplete) {
                        manualMode = false;  // Disable manual mode once all centroids are selected
                        alert('All centroids selected. You can now run KMeans.');
                    }
                })
                .catch(error => {
                    console.error("Error adding manual centroid:", error);
                });
        } else {
            console.log("Duplicate centroid detected. Ignoring the click.");
        }
    }
});



// Step through KMeans clustering (One iteration: assign points + recalculate centroids)
stepBtn.addEventListener('click', () => {
    fetch('/step', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(result => {
        centroids = result.centroids;
        clusters = result.clusters;
        plotData();  // Update the plot with the new clusters and centroids
    })
    .catch(error => {
        console.error("Error during step-through KMeans:", error);
    });
});


// Function to perform one iteration of KMeans (assign + recalculate)
function performOneIteration() {
    console.log("Performing one iteration of KMeans");  // Debugging log

    fetch('/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centroids: centroids })  // Send the current centroids
    })
    .then(response => response.json())
    .then(newClusters => {
        clusters = newClusters;
        // After assigning points, recalculate centroids
        return fetch('/recalculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clusters: clusters })  // Send the current clusters to recalculate centroids
        });
    })
    .then(response => response.json())
    .then(newCentroids => {
        centroids = newCentroids;  // Update the centroids after recalculating
        plotData();  // Plot the clusters and centroids after one full iteration
    })
    .catch(error => {
        console.error("Error during one iteration:", error);  // Error handling
    });
}


// Converge KMeans algorithm with convergence alert
convergeBtn.addEventListener('click', () => {
    fetch('/converge', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ maxIterations: 100 }) 
    })
    .then(response => response.json())
    .then(result => {
        centroids = result.centroids;
        clusters = result.clusters;  // Make sure clusters are updated from the backend
        plotData();  // Update the plot with the final centroids and clusters

        if (result.converged) {
            alert("KMeans has converged!");  // Show alert when KMeans converges
        }
    })
    .catch(error => {
        console.error("Error during convergence:", error);
    });
});



// Reset the clustering process
resetBtn.addEventListener('click', () => {
    centroids = [];  // Clear centroids
    clusters = {};   // Clear clusters
    currentStep = 0;
    plotData();      // Clear plot
});


// Plot data points and centroids with cluster colors
function plotData() {
    plotDiv.innerHTML = '';  // Clear the plot area
    console.log(`centroids: ${JSON.stringify(centroids)}`);

    // Plot data points (blue for unclustered points)
    if (Object.keys(clusters).length === 0) {
        data.forEach(point => {
            let pointDiv = document.createElement('div');
            pointDiv.className = 'point';
            pointDiv.style.left = `${point.x}px`;
            pointDiv.style.top = `${point.y}px`;
            pointDiv.style.backgroundColor = 'blue';  // Default color for unclustered points
            plotDiv.appendChild(pointDiv);
        });
    } else {
        // Plot clustered data points
        Object.keys(clusters).forEach((clusterIndex, idx) => {
            const color = clusterColors[idx % clusterColors.length];  // Use different colors for clusters
            clusters[clusterIndex].forEach(point => {
                let pointDiv = document.createElement('div');
                pointDiv.className = 'point';
                pointDiv.style.left = `${point.x}px`;
                pointDiv.style.top = `${point.y}px`;
                pointDiv.style.backgroundColor = color;  // Set color by cluster
                plotDiv.appendChild(pointDiv);
            });
        });
    }

    // Plot centroids (black for centroids)
    centroids.forEach(centroid => {
        let centroidDiv = document.createElement('div');
        centroidDiv.className = 'centroid';
        centroidDiv.style.left = `${centroid.x}px`;
        centroidDiv.style.top = `${centroid.y}px`;
        centroidDiv.style.backgroundColor = 'black';  // Centroids in black
        plotDiv.appendChild(centroidDiv);
    });
}