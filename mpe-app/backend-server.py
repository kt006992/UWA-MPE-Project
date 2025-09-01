# backend-server.py  —— 改为输出 JSON 给 Chart.js
import pandas as pd
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# ---------- 全局数据 ----------
df = None
df_top = None
df_bottom = None

# ---------- 工具函数（沿用你的分段逻辑，前端做配色） ----------
def read_excel_with_duplicate_columns(file_path, degree):
    df = pd.read_excel(file_path, header=[0, 1], sheet_name=degree)
    df.columns = ['_'.join(map(str, col)).strip() for col in df.columns.values]
    return df

def read_excel_process(file_path, degree):
    df = read_excel_with_duplicate_columns(file_path, degree)
    if degree in ['6-degree', '12-degree']:
        df_top = df.head(37)
        df_bottom = df.tail(4)
    elif degree == '10^2':
        df_top = df.head(68)
        df_bottom = df.tail(4)
    else:
        raise ValueError("Unsupported sheet degree")
    return df, df_top, df_bottom

def check_data_loaded():
    return not (df is None or df_top is None or df_bottom is None)

# ---------- 上传 ----------
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
            directory = f"uploads/{degree}"
            os.makedirs(directory, exist_ok=True)
            file_path = f"{directory}/{file.filename}"
            file.save(file_path)
            df, df_top, df_bottom = read_excel_process(file_path, degree)
            # 返回可用的列名，方便前端做校验或调试
            return jsonify({
                "message": "File successfully uploaded and processed",
                "top_cols": list(df_top.columns),
                "bottom_cols": list(df_bottom.columns)
            }), 200
        except Exception as e:
            return jsonify({"error": f"Error processing file: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file format. Please upload an .xlsx file."}), 400

# ---------- 1) 各时间点散点数据（含坐标与数值） ----------
@app.route('/data/timepoint/scatter', methods=['GET'])
def data_timepoint_scatter():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400

    coord_cols = [col for col in df_top.columns if 'Coordinates' in col][:2]
    time_cols = [col for col in df_top.columns if 'Time point' in col]

    datasets = []
    for tcol in time_cols:
        month = tcol.split('_')[-1]
        points = []
        for _, row in df_top.iterrows():
            points.append({
                "x": float(row[coord_cols[0]]),
                "y": float(row[coord_cols[1]]),
                "value": float(row[tcol]) if pd.notna(row[tcol]) else None
            })
        datasets.append({"label": f"{month} months", "points": points, "month": month})

    # 返回坐标范围，便于前端设置比例尺
    x_vals = df_top[coord_cols[0]].astype(float)
    y_vals = df_top[coord_cols[1]].astype(float)
    resp = {
        "datasets": datasets,
        "xRange": [float(x_vals.min()), float(x_vals.max())],
        "yRange": [float(y_vals.min()), float(y_vals.max())],
        "xLabel": "X (coordinate)",
        "yLabel": "Y (coordinate)"
    }
    return jsonify(resp), 200

# ---------- 2) 回归（点位回归值） ----------
@app.route('/data/regression', methods=['GET'])
def data_regression():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400

    coord_cols = [col for col in df_top.columns if 'Coordinates' in col][:2]
    reg_cols = [col for col in df_top.columns if 'Point wise regression' in col]
    if not reg_cols:
        return jsonify({"error": "No regression columns found."}), 400

    points = []
    for _, row in df_top.iterrows():
        points.append({
            "x": float(row[coord_cols[0]]),
            "y": float(row[coord_cols[1]]),
            "regression": float(row[reg_cols[0]]) if pd.notna(row[reg_cols[0]]) else None
        })

    x_vals = df_top[coord_cols[0]].astype(float)
    y_vals = df_top[coord_cols[1]].astype(float)
    return jsonify({
        "points": points,
        "xRange": [float(x_vals.min()), float(x_vals.max())],
        "yRange": [float(y_vals.min()), float(y_vals.max())],
        "legend": [
            { "label": ">= 7 dB", "range": [7, None] },
            { "label": "2 to < 7 dB", "range": [2, 7] },
            { "label": "-2 to < 2 dB", "range": [-2, 2] },
            { "label": "-7 to < -2 dB", "range": [-7, -2] },
            { "label": "<= -7 dB", "range": [None, -7] }
        ]
    }), 200

# ---------- 3) Longitudinal vs baseline（逐月变化点云） ----------
@app.route('/data/change/scatter', methods=['GET'])
def data_change_scatter():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400

    coord_cols = [col for col in df_top.columns if 'Coordinates' in col][:2]
    change_cols = [col for col in df_top.columns if 'Change over the time' in col]

    datasets = []
    for ccol in change_cols:
        month = ccol.replace('Change over the time vs baseline_', '')
        points = []
        for _, row in df_top.iterrows():
            points.append({
                "x": float(row[coord_cols[0]]),
                "y": float(row[coord_cols[1]]),
                "delta": float(row[ccol]) if pd.notna(row[ccol]) else None
            })
        datasets.append({"label": f"{month} months", "points": points, "month": month})

    x_vals = df_top[coord_cols[0]].astype(float)
    y_vals = df_top[coord_cols[1]].astype(float)
    return jsonify({
        "datasets": datasets,
        "xRange": [float(x_vals.min()), float(x_vals.max())],
        "yRange": [float(y_vals.min()), float(y_vals.max())]
    }), 200

# ---------- 4) 时间点类别计数（堆叠柱状） ----------
@app.route('/data/timepoint/bars', methods=['GET'])
def data_timepoint_bars():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400

    cols = [c for c in df_bottom.columns if 'Time point' in c]
    # 行是类别（normal/subnormal/abnormal/dense scotoma），列是月份
    # 直接把 df_bottom 4 行 * T 列返回
    matrix = df_bottom[cols].values.tolist()
    labels = [c.replace('Time point ', '') for c in cols]
    categories = ['normal', 'subnormal', 'abnormal', 'dense scotoma']
    return jsonify({
        "xLabels": labels,     # x 轴：各个月份
        "seriesLabels": categories,  # 图例：四个类别
        "matrix": matrix       # 4 x T
    }), 200

# ---------- 5) 相对基线类别计数（堆叠柱状） ----------
@app.route('/data/change/bars', methods=['GET'])
def data_change_bars():
    if not check_data_loaded():
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400

    cols = [c for c in df_bottom.columns if 'Change over the time' in c]
    matrix = df_bottom[cols].values.tolist()
    labels = [c.replace('Change over the time vs baseline', '[months]') for c in cols]
    categories = ['normal', 'subnormal', 'abnormal', 'dense scotoma']
    return jsonify({
        "xLabels": labels,
        "seriesLabels": categories,
        "matrix": matrix
    }), 200

# ---------- 健康检查 ----------
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Backend server is running"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
