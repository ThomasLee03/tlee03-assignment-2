from flask import Flask, render_template, jsonify, request
import numpy as np
import random
from sklearn.metrics import pairwise_distances_argmin_min

app = Flask(__name__)

# Global variables for data, centroids, and clusters
data = []
centroids = []
clusters = []
k = 3  # Default number of clusters

# Generate a random dataset
@app.route('/generate', methods=['POST'])
def generate_data():
    global data
    num_points = request.json.get('numPoints', 200)  # Default to 200 points
    data = [{'x': random.random() * 500, 'y': random.random() * 500} for _ in range(num_points)]
    return jsonify(data)

# Random initialization
def random_initialization():
    global centroids
    centroids = random.sample(data, k)
    return centroids

# Farthest First initialization
def farthest_first_initialization():
    global centroids
    centroids = [random.choice(data)]  # Start with one random point

    while len(centroids) < k:
        farthest_point = None
        max_dist = -1
        # Find the point farthest from any centroid
        for point in data:
            min_dist_to_centroid = min([np.linalg.norm(np.array([point['x'], point['y']]) - np.array([c['x'], c['y']])) for c in centroids])
            if min_dist_to_centroid > max_dist:
                max_dist = min_dist_to_centroid
                farthest_point = point
        centroids.append(farthest_point)
    
    return centroids

# KMeans++ initialization
def kmeans_plus_plus_initialization():
    global centroids
    centroids = [random.choice(data)]
    for _ in range(k - 1):
        distances = [min([np.linalg.norm(np.array([p['x'], p['y']]) - np.array([c['x'], c['y']])) for c in centroids]) for p in data]
        probabilities = np.array(distances) ** 2 / np.sum(np.array(distances) ** 2)
        cumulative_prob = np.cumsum(probabilities)
        r = random.random()
        for i, p in enumerate(cumulative_prob):
            if r < p:
                centroids.append(data[i])
                break
    return centroids

@app.route('/step', methods=['POST'])
def step_through_kmeans():
    global centroids, clusters

    # Perform one iteration of KMeans:
    assign_points()  # Assign points to centroids
    recalculate_centroids()  # Recalculate centroids

    return jsonify({'centroids': centroids, 'clusters': clusters})





# Initialize centroids based on selected method
@app.route('/initialize', methods=['POST'])
def initialize_centroids():
    global centroids, k
    k = request.json.get('numCentroids', 3)  # Allow customizable number of centroids
    
    # Always clear the centroids list before initializing
    centroids = []

    method = request.json['method']
    
    if method == 'random':
        return jsonify(random_initialization())
    elif method == 'farthest':
        return jsonify(farthest_first_initialization())
    elif method == 'kmeans++':
        return jsonify(kmeans_plus_plus_initialization())
    
    return jsonify([])


@app.route('/manual_centroid', methods=['POST'])
def manual_centroid():
    global centroids, k

    # Clear centroids on the first manual click (if empty or switching to manual mode)
    if request.json.get('reset', False):
        centroids = []  # Reset centroids when manual mode starts

    point = request.json['point']
    centroids.append(point)
    
    # If all centroids are selected
    if len(centroids) == k:
        return jsonify({'centroids': centroids, 'manualComplete': True})
    return jsonify({'centroids': centroids, 'manualComplete': False})







# Assign points to the nearest centroid
@app.route('/assign', methods=['POST'])
def assign_points():
    global clusters, centroids
    clusters = {i: [] for i in range(len(centroids))}  # Initialize clusters
    
    for point in data:
        distances = [np.linalg.norm(np.array([point['x'], point['y']]) - np.array([c['x'], c['y']])) for c in centroids]
        nearest_centroid = np.argmin(distances)
        clusters[nearest_centroid].append(point)
    
    return jsonify(clusters)

# Recalculate centroids based on clusters
@app.route('/recalculate', methods=['POST'])
def recalculate_centroids():
    global clusters, centroids
    new_centroids = []

    # Recalculate the centroids by averaging the points in each cluster
    for cluster in clusters.values():
        if cluster:  # If the cluster is not empty
            new_x = np.mean([p['x'] for p in cluster])
            new_y = np.mean([p['y'] for p in cluster])
            new_centroids.append({'x': new_x, 'y': new_y})
        else:
            # If the cluster is empty, keep the centroid in place or randomly select a new point
            new_centroids.append(random.choice(data))  # Fallback to a random point if cluster is empty

    centroids = new_centroids  # Update the global centroids variable
    return jsonify(centroids)  # Return the updated centroids as a JSON response



@app.route('/converge', methods=['POST'])
def converge():
    global centroids, clusters
    max_iterations = request.json.get('maxIterations', 100)
    converged = False
    
    for iteration in range(max_iterations):
        old_centroids = centroids[:]
        
        # Assign points to nearest centroid
        assign_points()  # This updates the global clusters
        
        # Recalculate centroids based on the new clusters
        recalculate_centroids()  # This now uses the global clusters directly
        
        # Check if centroids have stopped changing (convergence condition)
        centroids_moved = [
            np.linalg.norm(np.array([old['x'], old['y']]) - np.array([new['x'], new['y']]))
            for old, new in zip(old_centroids, centroids)
        ]
        if all(movement < 1e-2 for movement in centroids_moved):  # Ensure threshold isn’t too strict
            converged = True
            break
    
    return jsonify({'converged': converged, 'centroids': centroids, 'clusters': clusters})





# Serve the main webpage
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(port=3000, debug=True)
