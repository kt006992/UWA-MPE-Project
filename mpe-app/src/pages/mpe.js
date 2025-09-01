"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './mpe.css';

import ChartJSWrapper from '../components/ChartJSWrapper';
import PlotlyWrapper from '../components/PlotlyWrapper';

import { colorByValue, colorByRegression, colorByDelta, PLOTLY_COLOR_SCALE } from '../utils/colors';
import { genScatterFromDatasets, genScatterFromPoints, genStackedBar } from '../utils/chartBuilders';
import { exportChartsToPDF } from '../utils/pdfExport';
import { fetchJSON, endpoints } from '../utils/api';

import useFileUpload from '../hooks/useFileUpload';

const Page = () => {
  const [selectedTopButton, setSelectedTopButton] = useState("6-degree");
  const [selectedButton, setSelectedButton] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // uplaod
  const { selectedFile, isFileUploaded, isUploading, handleFileChange, uploadFile, reset, setIsFileUploaded } =
    useFileUpload(selectedTopButton);

  // render area
  const [items, setItems] = useState([]); // [{node, exportRef, kind}]
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const buttonContainerRef = useRef(null);

  useEffect(() => {
    if (items.length > 0) {
      buttonContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [items]);

  const onDragOver = e => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = e => { e.preventDefault(); setIsDragging(false); };
  const onDrop = e => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); };

  const handleTopButtonClick = (label) => {
    setSelectedTopButton(label);
    setSelectedButton(null);
    reset();
    setItems([]);
  };

  // Pull data & generate graph
  const fetchAndRender = async (key) => {
    if (!isFileUploaded) { toast.error('Please upload a file first.'); return; }
    setIsLoading(true); setItems([]);
    try {
      let payload, chartDefs = [];
      if (key === 'generate_scatter_plots') {
        payload = await fetchJSON(endpoints.timeScatter);
        chartDefs.push(genScatterFromDatasets(payload, 'Individual time-point plots', 'value', colorByValue));
      } else if (key === 'generate_regression_plot') {
        payload = await fetchJSON(endpoints.regression);
        chartDefs.push(genScatterFromPoints(payload, 'Pointwise Regression Plot', 'regression', colorByRegression));
      } else if (key === 'generate_change_monitor_plots') {
        payload = await fetchJSON(endpoints.changeScatter);
        chartDefs.push(genScatterFromDatasets(payload, 'Longitudinal point-wise changes vs baseline', 'delta', colorByDelta));
      } else if (key === 'generate_time_point_bar') {
        payload = await fetchJSON(endpoints.timeBars);
        chartDefs.push(genStackedBar(payload, 'Longitudinal change in number of loci'));
      } else if (key === 'generate_change_monitor_bar') {
        payload = await fetchJSON(endpoints.changeBars);
        chartDefs.push(genStackedBar(payload, 'Longitudinal change of loci counts vs baseline'));
      } else if (key === 'generate_3d_surface') {
        const p = await fetchJSON(endpoints.timeScatter);
        // 3D plot
        const nodes = p.datasets.map(ds => {
          const plotRef = React.createRef();
          const x = ds.points.map(p => p.x);
          const y = ds.points.map(p => p.y);
          const z = ds.points.map(p => (p.value ?? null));
          return { node: <PlotlyWrapper ref={plotRef} title={`3D Threshold Surface: ${ds.label}`} x={x} y={y} z={z} colorscale={PLOTLY_COLOR_SCALE} />,
                   exportRef: plotRef, kind: 'plotly' };
        });
        setItems(nodes);
        return;
      }

      // Converting Chart.js configuration to Node
      const list = chartDefs.map(def => {
        const chartRef = React.createRef();
        return {
          node: <ChartJSWrapper ref={chartRef} type={def.type} data={def.data} options={def.options} />,
          exportRef: chartRef,
          kind: 'chartjs'
        };
      });
      setItems(list);
    } catch (e) {
      console.error(e);
      toast.error('Error generating charts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFunctionalButtonClick = (label, key) => {
    setSelectedButton(label);
    fetchAndRender(key);
  };

  const exportPDF = async () => {
    if (!selectedButton || items.length === 0) { toast.error('No charts available for export.'); return; }
    setIsExporting(true);
    const notice = toast.info('Exporting PDF...', { autoClose: false, position: 'top-center' });
    try {
      await exportChartsToPDF(items.map(i => ({ kind: i.kind, ref: i.exportRef })), `${(selectedButton || 'charts').replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`);
      toast.update(notice, { render: 'PDF exported!', type: 'success', autoClose: 1500 });
    } catch (e) {
      console.error(e);
      toast.update(notice, { render: 'Export failed', type: 'error', autoClose: 2000 });
    } finally {
      setIsExporting(false);
    }
  };

  const bottomButtons = [
    { label: "Individual time-point plots", key: "generate_scatter_plots" },
    { label: "Pointwise Regression Plot", key: "generate_regression_plot" },
    { label: "Longitudinal point-wise changes against baseline", key: "generate_change_monitor_plots" },
    { label: "Longitudinal change in number of loci", key: "generate_time_point_bar" },
    { label: "Longitudinal change of loci counts against baseline", key: "generate_change_monitor_bar" },
    { label: "3D Surface (per time point)", key: "generate_3d_surface" }
  ];

  return (
    <div className="page-container">
      <header className="header">
        <div className="header-content">
          <div className="top-buttons">
            {["6-degree", "12-degree", "10^2"].map(label => (
              <button key={label} className={`top-button ${selectedTopButton === label ? 'selected' : ''}`} onClick={() => { setSelectedTopButton(label); setSelectedButton(null); setItems([]); setIsFileUploaded(false); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="export-button-container">
            <button className="export-button" onClick={exportPDF} disabled={items.length === 0 || isExporting}>
              {isExporting ? 'Exporting...' : 'Export as PDF'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-container">
          <div className="content-panel">
            <div className={`file-drop-zone ${isDragging ? 'dragging' : ''}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
              <input id="file-upload" type="file" className="file-input" onChange={(e) => handleFileChange(e.target.files)} />
              <label htmlFor="file-upload" className="file-label">
                <span className="file-icon">+</span>
                <span className="file-text">Drop or import file here</span>
              </label>

              {selectedFile && (
                <div className="selected-file">
                  Selected file: {selectedFile.name}
                  {isFileUploaded && <span className="upload-status"> ✓ Uploaded</span>}
                </div>
              )}

              <div className="upload-button-container">
                <button className="upload-button" onClick={async () => {
                  try { await uploadFile(); toast.success('File uploaded successfully!'); }
                  catch { toast.error('Error uploading file'); }
                }} disabled={!selectedFile || isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </div>

            <div ref={buttonContainerRef} className="function-buttons">
              {bottomButtons.map(({ label, key }) => (
                <button key={label} className={`function-button ${selectedButton === label ? 'selected' : ''} ${!isFileUploaded ? 'disabled' : ''}`} onClick={() => handleFunctionalButtonClick(label, key)} disabled={!isFileUploaded}>
                  {label}
                </button>
              ))}
            </div>

            <div className="image-container" style={{ flexDirection: 'column', gap: 24, width: '100%' }}>
              {isLoading && (
                <div className="loading-container">
                  <div className="loader"></div>
                  <p className="loading-text">Generating charts...</p>
                </div>
              )}
              {!isLoading && items.map((it, i) => (
                <div key={i} style={{ width: '100%' }}>
                  {it.node}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ToastContainer position="top-center" autoClose={1500} />
    </div>
  );
};

export default Page;
