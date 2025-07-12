import matplotlib
matplotlib.use('Agg')  # Use Agg backend for rendering to a file
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from flask import Flask, send_file, jsonify, request
from mpl_toolkits.mplot3d import Axes3D
from scipy.interpolate import griddata
import matplotlib.colors as mcolors
import io 
from io import BytesIO
from flask_cors import CORS
import os
import matplotlib.lines as mlines
from matplotlib.gridspec import GridSpec
from mpl_toolkits.axes_grid1.inset_locator import inset_axes

app = Flask(__name__)
CORS(app)

# Global variables to store data
df = None
df_top = None
df_bottom = None

# Helper functions
def get_color_based_on_threshold(value):
    if value >= 24:
        return 'green'  # Normal
    elif 13 <= value <= 23:
        return 'orange'  # Subnormal
    elif 0 <= value <= 12:
        return 'red'  # Abnormal
    else:
        return 'black'  # Dense scotoma

def get_color_based_on_value(value):
    if value < 0:
        return 'black'
    elif value < 13:
        return 'red'
    elif value <= 23:
        return 'orange'
    else:
        return 'green'

def get_color_based_on_regression(value):
    if value >= 7:
        return 'blue'
    elif 2 <= value < 7:
        return 'green'
    elif -2 <= value < 2:
        return 'yellow'
    elif -7 <= value < -2:
        return 'orange'
    elif value <= -7:
        return 'red'
    
def get_color_based_on_change_monitor(value):
    if value >= 7:
        return 'blue'
    elif 2 <= value < 7:
        return 'green'
    elif -2 <= value < 2:
        return 'yellow'
    elif -7 <= value < -2:
        return 'orange'
    elif value <= -7:
        return 'red'

# Helper function for bar charts
def create_bar_chart(data, labels, xlabel, ylabel, title, colors, xticks):
    fig, ax = plt.subplots(figsize=(10, 7))
    n_groups, n_bars = data.shape
    bar_width = 0.2
    index = np.arange(n_groups)

    for i in range(n_bars):
        ax.bar(index + i * bar_width, data[:, i], bar_width, color=colors[i], label=labels[i])

    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.set_xticks(index + bar_width * (n_bars - 1) / 2)
    ax.set_xticklabels(xticks, rotation=45, ha='right')
    ax.legend()

    # Adjust the bottom margin to ensure x-axis labels are fully visible
    fig.subplots_adjust(bottom=0.3)

    # Save figure to a bytes buffer
    img = io.BytesIO()
    plt.tight_layout()
    plt.savefig(img, format='png')
    img.seek(0)
    plt.close()

    return img

def read_excel_with_duplicate_columns(file_path, degree):
    print(f"Reading file: {file_path}")
    df = pd.read_excel(file_path, header=[0, 1], sheet_name=degree)
    df.columns = ['_'.join(map(str, col)).strip() for col in df.columns.values]
    return df

def read_excel_process(file_path, degree):
    # Read and process Excel files and return relevant data
    df = read_excel_with_duplicate_columns(file_path, degree)
    if degree in ['6-degree', '12-degree']:
        df_top = df.head(37)
        df_bottom = df.tail(4)
    elif degree == '10^2':
        df_top = df.head(68)
        df_bottom = df.tail(4)
    return df, df_top, df_bottom

# Data loading from uploaded file
@app.route('/upload', methods=['POST'])
def upload_file():
    global df, df_top, df_bottom
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    degree = request.form.get('degree', '6-degree') 
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.endswith('.xlsx'):
        try:
            # Create upload directory if it doesn't exist
            directory = f"uploads/{degree}"
            if not os.path.exists(directory):
                os.makedirs(directory)
            
            file_path = f"uploads/{degree}/{file.filename}"
            file.save(file_path)
            
            # Process the uploaded Excel file
            df, df_top, df_bottom = read_excel_process(file_path, degree)
            
            return jsonify({"message": "File successfully uploaded and processed"}), 200
            
        except Exception as e:
            return jsonify({"error": f"Error processing file: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file format. Please upload an .xlsx file."}), 400

# Check if data is loaded
def check_data_loaded():
    if df is None or df_top is None or df_bottom is None:
        return False
    return True

# Define endpoints
# Scatter plot of Time point data
@app.route('/generate_scatter_plots', methods=['GET'])
def generate_scatter_plots():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400
    
    try:
        img = io.BytesIO()

        plt.rcParams.update({'font.size': 18})

        Coordinates_columns = [col for col in df_top.columns if 'Coordinates' in col][:2]
        Time_point_columns = [col for col in df_top.columns if 'Time point' in col]

        n_cols = 2  
        n_rows = len(Time_point_columns)  

        # Create a figure to hold all scatter plots and 3D plots
        fig = plt.figure(figsize=(18, 10 * n_rows), dpi=100)

        cmap = mcolors.LinearSegmentedColormap.from_list('custom_cmap', ['black', 'red', 'orange', 'green'])

        x_min, x_max = df_top[Coordinates_columns[0]].min() - 2, df_top[Coordinates_columns[0]].max() + 2
        y_min, y_max = df_top[Coordinates_columns[1]].min() - 2, df_top[Coordinates_columns[1]].max() + 2

        # Create a scatter plot and a 3D surface plot for each time point, arranged in a row
        for i, time_col in enumerate(Time_point_columns):

            month = time_col.split('_')[-1]

            # Create the left subplot: scatter plot
            ax_scatter = fig.add_subplot(n_rows, n_cols, i * n_cols + 1)
            for idx, row in df_top.iterrows():
                x = row[Coordinates_columns[0]]
                y = row[Coordinates_columns[1]]
                time_value = row[time_col]
                color = get_color_based_on_value(time_value)
                ax_scatter.scatter(x, y, color=color, alpha=0.7)
            
            ax_scatter.set_title(f'Time Point: {month} months')
            ax_scatter.set_aspect('equal')
            ax_scatter.set_xlim(x_min, x_max)
            ax_scatter.set_ylim(y_min, y_max)
            ax_scatter.grid(True)

            ax_scatter.set_xlabel('X (coordinate)', fontsize=16) 
            ax_scatter.set_ylabel('Y (coordinate)', fontsize=16) 

            if i == 0:
                # Add a legend
                black_patch = mlines.Line2D([], [], color='black', marker='o', linestyle='None', markersize=10, label='< 0 dB (Dense scotoma)')
                red_patch = mlines.Line2D([], [], color='red', marker='o', linestyle='None', markersize=10, label='0-12 dB (Abnormal)')
                orange_patch = mlines.Line2D([], [], color='orange', marker='o', linestyle='None', markersize=10, label='13-23 dB (Subnormal)')
                green_patch = mlines.Line2D([], [], color='green', marker='o', linestyle='None', markersize=10, label='> 24 dB (Normal)')

                # labeling
                ax_scatter.legend(handles=[black_patch, red_patch, orange_patch, green_patch],
                          loc='center left',
                          bbox_to_anchor=(1, 0.5),  
                          title='Value Legend', title_fontsize='16')

            # Create the sub-image on the right: 3D terrain map
            ax_3d = fig.add_subplot(n_rows, n_cols, i * n_cols + 2, projection='3d')
            z_data = df_top[time_col]
            grid_x, grid_y = np.mgrid[x_min:x_max:100j, y_min:y_max:100j]
            grid_z = griddata((df_top[Coordinates_columns[0]], df_top[Coordinates_columns[1]]), z_data, (grid_x, grid_y), method='cubic')

            surf = ax_3d.plot_surface(grid_x, grid_y, grid_z, cmap=cmap, vmin=-1, vmax=30, edgecolor='none', alpha=0.8)
            ax_3d.set_title(f'Time Point: {month} months')
            ax_3d.set_zlim(-1, 30)

            ax_3d.set_xlabel('X (coordinate)', fontsize=14)
            ax_3d.set_ylabel('Y (coordinate)', fontsize=14)
            ax_3d.set_zlabel('Threshold Value (dB)', fontsize=10)

            if i == 0:
                fig.colorbar(surf, ax=ax_3d, shrink=0.6, aspect=15)
        
        plt.tight_layout()
        # Save and return the image
        fig.savefig(img, format='png')
        img.seek(0)
        plt.close(fig)

        return send_file(img, mimetype='image/png')
    
    except Exception as e:
        return jsonify({"error": f"Error generating scatter plots: {str(e)}"}), 500

# Regression Data Scatter Plot
@app.route('/generate_regression_plot', methods=['GET'])
def generate_regression_plot():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400
    
    try:
        Coordinates_columns = [col for col in df_top.columns if 'Coordinates' in col][:2]
        regression_columns = [col for col in df_top.columns if 'Point wise regression' in col]
        time_point_columns = [col for col in df_top.columns if 'Time point' in col]

        img = io.BytesIO()

        # Create a figure with two subplots
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(33, 13)) 

        # The first sub-graph: a small line chart based on coordinates
        x = df_top[Coordinates_columns[0]]
        y = df_top[Coordinates_columns[1]]
        ax1.scatter(x, y, alpha=0)  # Draw a transparent scatter plot on the first subplot to set the coordinates

        inset_width = inset_height = 1.0  # The size ratio of the inserted image

        for idx, row in df_top.iterrows():
            ax_inset = inset_axes(ax1, width=inset_width, height=inset_height, loc='center',
                                  bbox_to_anchor=(row[Coordinates_columns[0]], row[Coordinates_columns[1]]),
                                  bbox_transform=ax1.transData, borderpad=0)
            ax_inset.plot(row[time_point_columns], color='gray')
            ax_inset.set_xticks([])
            ax_inset.set_yticks([])

            regression_value = row[regression_columns[0]]
            edge_color = get_color_based_on_regression(regression_value)
            for spine in ax_inset.spines.values():
                spine.set_edgecolor(edge_color)
                spine.set_linewidth(2)
        
        ax1.set_title('Time points sequence', fontsize=25)  
        ax1.tick_params(axis='both', which='major', labelsize=25)

        # Second subplot: regression scatter plot
        ax2.set_title('Pointwise Regression Plot', fontsize=25)
        scatter_colors = [get_color_based_on_regression(row[regression_columns[0]]) for _, row in df_top.iterrows()]
        ax2.scatter(x, y, c=scatter_colors, alpha=0.7, s=500)
        ax2.grid(True, linestyle='--', linewidth=0.5, color='grey')
        ax2.tick_params(axis='both', which='major', labelsize=25)

        # Setting the Legend
        legend_labels = ['>= 7 dB (Blue)', '2 dB to < 7 dB (Green)', '-2 dB to < 2 dB (Yellow)', '-7 dB to < -2 dB (Orange)', '<= -7 dB (Red)']
        legend_colors = ['blue', 'green', 'yellow', 'orange', 'red']
        handles = [plt.Line2D([0], [0], marker='o', color=color, lw=0, label=label, markersize=10)
                   for label, color in zip(legend_labels, legend_colors)]
        ax2.legend(handles=handles, loc='center left', bbox_to_anchor=(1.1, 0.5), fontsize=25) 

        plt.tight_layout()
        plt.savefig(img, format='png')
        img.seek(0)
        plt.close()

        return send_file(img, mimetype='image/png')
    
    except Exception as e:
        return jsonify({"error": f"Error generating regression plot: {str(e)}"}), 500

# Change Monitor Plot vs Baseline
@app.route('/generate_change_monitor_plots', methods=['GET'])
def generate_change_monitor_plots():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400
    
    try:
        img = io.BytesIO()

        Coordinates_columns = [col for col in df_top.columns if 'Coordinates' in col][:2]
        change_monitor_columns = [col for col in df_top.columns if 'Change over the time' in col]

        # Determine the number of rows and columns
        n_cols = 3
        n_rows = -(-len(change_monitor_columns) // n_cols)

        fig_change, axes_change = plt.subplots(n_rows, n_cols, figsize=(15, 5 * n_rows)) 
        axes_change = axes_change.flatten()

        x_min, x_max = df_top[Coordinates_columns[0]].min() - 2, df_top[Coordinates_columns[0]].max() + 2
        y_min, y_max = df_top[Coordinates_columns[1]].min() - 2, df_top[Coordinates_columns[1]].max() + 2

        for i, change_col in enumerate(change_monitor_columns):
            ax = axes_change[i]

            for idx, row in df_top.iterrows():
                x = row[Coordinates_columns[0]]
                y = row[Coordinates_columns[1]]
                data_value = row[change_col]
                color = get_color_based_on_change_monitor(data_value)
                ax.scatter(x, y, color=color, alpha=0.7)

            # Remove the prefix from the title
            clean_title = change_col.replace('Change over the time vs baseline_', '')
            ax.set_title(f'{clean_title} months')
            ax.set_aspect('equal')
            ax.set_xlim(x_min, x_max)
            ax.set_ylim(y_min, y_max)
            ax.set_xlabel('x [degrees]')
            ax.set_ylabel('y [degrees]')
            ax.grid(True)

        # If there are empty subplots, remove them
        for j in range(i + 1, len(axes_change)):
            fig_change.delaxes(axes_change[j])

        # Create the color legend with specific labels
        legend_labels = ['+7 dB or greater', '+2 dB to +7 dB', '-2 dB to +2 dB', '-7 dB to -2 dB', '-7 dB or less']
        legend_colors = ['blue', 'green', 'yellow', 'orange', 'red']

        # Create legend patches
        handles = [plt.Line2D([0], [0], marker='o', color=color, lw=0, label=label, markersize=10)
                   for label, color in zip(legend_labels, legend_colors)]

        # Add legend outside the last plot to the right
        fig_change.legend(handles=handles, loc='center left', bbox_to_anchor=(1.05, 0.5), title="Legend")

        # Save plot to buffer
        plt.tight_layout()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        plt.close()

        return send_file(img, mimetype='image/png')
    
    except Exception as e:
        return jsonify({"error": f"Error generating change monitor plots: {str(e)}"}), 500

# Route to generate change_monitor bar chart
@app.route('/generate_change_monitor_bar', methods=['GET'])
def generate_change_monitor_bar():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400
    
    try:
        changing_point_columns = [col for col in df_bottom.columns if 'Change over the time' in col]
        changing_point_data = df_bottom[changing_point_columns].values.T 
        labels = ['normal', 'subnormal', 'abnormal', 'dense scotoma']
        colors = ['green', 'orange', 'red', 'black']

        # Remove "Time point" from the label
        cleaned_changing_point_columns = [col.replace('Change over the time vs baseline', '[months]') for col in changing_point_columns]

        img = create_bar_chart(changing_point_data, labels, 'Time period', 'Counting numbers', 
                               'Bar chart of changing loci against baseline', colors, cleaned_changing_point_columns)
        return send_file(img, mimetype='image/png')
    
    except Exception as e:
        return jsonify({"error": f"Error generating change monitor bar chart: {str(e)}"}), 500

# Route to generate time_point bar chart
@app.route('/generate_time_point_bar', methods=['GET'])
def generate_time_point_bar():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400
    
    try:
        count_point_columns = [col for col in df_bottom.columns if 'Time point' in col]
        count_point_data = df_bottom[count_point_columns].values.T 
        labels = ['normal', 'subnormal', 'abnormal', 'dense scotoma']
        colors = ['green', 'orange', 'red', 'black']

        cleaned_count_point_columns = [col.replace('Time point ', '') for col in count_point_columns]

        img = create_bar_chart(count_point_data, labels, 'Time period', 'Counting numbers', 
                               'Bar chart of changing loci', colors, cleaned_count_point_columns)
        return send_file(img, mimetype='image/png')
    
    except Exception as e:
        return jsonify({"error": f"Error generating time point bar chart: {str(e)}"}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Backend server is running"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)