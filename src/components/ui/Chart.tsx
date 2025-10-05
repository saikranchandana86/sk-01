import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ComponentData } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { evaluateExpression } from '../../utils/expressionEvaluator';
import { BarChart3, LineChart, PieChart, TrendingUp, Download, RefreshCw, Maximize2 } from 'lucide-react';

interface ChartSeries {
  title: string;
  color: string;
  data: string;
}

interface ChartProps {
  title: string;
  chartType: 'line' | 'bar' | 'pie' | 'column' | 'area' | 'custom';
  chartData?: string;
  series: ChartSeries[];
  xAxisName: string;
  yAxisName: string;
  visible: boolean;
  animateLoading: boolean;
  allowScroll: boolean;
  showDataLabels: boolean;
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  customEChartsConfig?: string;
  customFusionChartsConfig?: string;
  labelOrientation: 'auto' | 'horizontal' | 'vertical' | 'slant';
  labelTextSize: number;
  gridLineColor: string;
  enableTooltip: boolean;
  onDataPointClick?: string;
}

interface ChartComponentProps {
  component: ComponentData;
}

interface DataPoint {
  x: string | number;
  y: number;
  [key: string]: any;
}

export const Chart: React.FC<ChartComponentProps> = ({ component }) => {
  const props = component.props as ChartProps;
  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { components, apis, globalState, sqlQueries } = useAppStore();

  const baseStyle = {
    width: '100%',
    height: '100%',
    ...component.style,
  };

  const evaluatedSeries = useMemo(() => {
    const context = { components, apis, sqlQueries, globalState } as any;

    return props.series.map(s => {
      let data: DataPoint[] = [];

      try {
        if (s.data && typeof s.data === 'string') {
          console.log('Chart: Evaluating series data:', s.data);

          // Try to parse as JSON first (for static data like [{x:"a",y:1}])
          let result: any;
          const trimmed = s.data.trim();

          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
              // First try standard JSON
              result = JSON.parse(trimmed);
              console.log('Chart: Parsed as strict JSON:', result);
            } catch (jsonError) {
              console.log('Chart: Strict JSON parse failed, trying relaxed JSON');
              try {
                // Try parsing with unquoted keys (JavaScript object notation)
                // Replace unquoted property names with quoted ones
                const relaxedJson = trimmed
                  .replace(/(\{|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
                  .replace(/'/g, '"'); // Also convert single quotes to double quotes
                console.log('Chart: Trying relaxed JSON:', relaxedJson);
                result = JSON.parse(relaxedJson);
                console.log('Chart: Parsed as relaxed JSON:', result);
              } catch (relaxedError) {
                console.log('Chart: Relaxed JSON failed, trying expression evaluation', relaxedError);
                // Not valid JSON, try expression evaluation
                result = evaluateExpression(s.data, context);
                console.log('Chart: Evaluated as expression:', result);
              }
            }
          } else {
            // Contains expressions like {{...}}
            result = evaluateExpression(s.data, context);
            console.log('Chart: Evaluated result:', result);
          }

          if (Array.isArray(result)) {
            data = result.map((item, idx) => {
              if (typeof item === 'object' && item !== null) {
                return {
                  x: item.x ?? item.label ?? item.name ?? idx,
                  y: Number(item.y ?? item.value ?? 0),
                  ...item
                };
              }
              return { x: idx, y: Number(item) };
            });
          } else if (typeof result === 'object' && result !== null) {
            // Handle object format (convert to array)
            data = Object.entries(result).map(([key, value]) => ({
              x: key,
              y: Number(value)
            }));
          } else {
            console.warn('Chart: Result is not an array:', typeof result, result);
          }
        } else if (Array.isArray(s.data)) {
          // Handle direct array data
          data = s.data.map((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              return {
                x: item.x ?? item.label ?? item.name ?? idx,
                y: Number(item.y ?? item.value ?? 0),
                ...item
              };
            }
            return { x: idx, y: Number(item) };
          });
        }
      } catch (error) {
        console.error('Error evaluating chart data:', error);
      }

      console.log('Chart: Final data for series:', s.title, data);

      return {
        title: s.title || 'Series',
        color: s.color || '#3b82f6',
        data
      };
    });
  }, [props.series, components, apis, sqlQueries, globalState]);

  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    evaluatedSeries.forEach(series => {
      series.data.forEach(point => {
        labels.add(String(point.x));
      });
    });
    return Array.from(labels);
  }, [evaluatedSeries]);

  const maxValue = useMemo(() => {
    let max = 0;
    evaluatedSeries.forEach(series => {
      series.data.forEach(point => {
        if (point.y > max) max = point.y;
      });
    });
    return max;
  }, [evaluatedSeries]);

  const handleDataPointClick = (point: DataPoint, seriesIndex: number) => {
    setSelectedDataPoint(point);

    if (props.onDataPointClick) {
      try {
        const context = {
          x: point.x,
          y: point.y,
          seriesTitle: evaluatedSeries[seriesIndex].title,
          rawData: point
        };
        new Function('dataPoint', props.onDataPointClick)(context);
      } catch (error) {
        console.error('Error executing onDataPointClick:', error);
      }
    }
  };

  const renderChart = () => {
    if (props.chartType === 'custom' && props.customEChartsConfig) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Custom ECharts configuration</p>
            <p className="text-sm mt-1">Configure via properties panel</p>
          </div>
        </div>
      );
    }

    if (evaluatedSeries.length === 0 || evaluatedSeries.every(s => s.data.length === 0)) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 p-6">
          <div className="text-center max-w-lg">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Chart Data</h3>
            <p className="text-sm mb-4">Follow these steps to visualize your data:</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 mb-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Create or Run an API</p>
                  <p className="text-xs text-gray-600 mt-0.5">Go to APIs panel and create an API, or click "Setup Demo API"</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Bind Data in Properties</p>
                  <p className="text-xs text-gray-600 mt-0.5">Select this chart, open Properties → Data → Chart series</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Type {'{{'} to see autocomplete</p>
                  <p className="text-xs text-gray-600 mt-0.5">Example: <code className="bg-gray-200 px-1 rounded text-xs">{`{{apiName.data.map(item => ({x: item.label, y: item.value}))}}`}</code></p>
                </div>
              </div>
            </div>

            {props.series.length > 0 && (
              <div className="mt-4 text-xs text-left">
                <p className="font-semibold mb-2 text-gray-700">Debug Info:</p>
                <div className="bg-gray-100 p-3 rounded text-left overflow-auto max-h-40 border border-gray-300">
                  <p className="mb-1"><span className="font-medium">Series configured:</span> {props.series.length}</p>
                  {props.series.map((s, idx) => (
                    <p key={idx} className="truncate mb-1">
                      <span className="font-medium">Series {idx + 1}:</span> {s.data?.substring(0, 60) || '(empty)'}...
                    </p>
                  ))}
                  <p className="mt-2 mb-1"><span className="font-medium">APIs available:</span> {apis.length}</p>
                  {apis.length === 0 ? (
                    <p className="text-orange-600">⚠ No APIs created yet</p>
                  ) : (
                    apis.map((api, idx) => (
                      <p key={idx} className={api.response ? 'text-green-600' : 'text-orange-600'}>
                        {api.response ? '✓' : '⚠'} {api.id}: {api.response ? 'Has data' : 'No data - Click Run button'}
                      </p>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (props.chartType) {
      case 'pie':
        return renderPieChart();
      case 'line':
      case 'area':
        return renderLineChart();
      case 'bar':
      case 'column':
      default:
        return renderBarChart();
    }
  };

  const renderBarChart = () => {
    const chartHeight = 300;
    const chartWidth = 100;
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };
    const barWidth = Math.min(40, chartWidth / allLabels.length / evaluatedSeries.length - 10);
    const groupWidth = barWidth * evaluatedSeries.length + 10;

    return (
      <div className="relative w-full h-full p-4">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                x2={chartWidth - padding.right}
                y2={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                stroke={props.gridLineColor || '#e5e7eb'}
                strokeWidth="0.2"
              />
              <text
                x={padding.left - 5}
                y={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                textAnchor="end"
                fontSize={props.labelTextSize || 3}
                fill="#6b7280"
                dominantBaseline="middle"
              >
                {Math.round(maxValue * (1 - ratio))}
              </text>
            </g>
          ))}

          {/* Bars */}
          {allLabels.map((label, labelIndex) => {
            const groupX = padding.left + (labelIndex * (chartWidth - padding.left - padding.right) / allLabels.length);

            return (
              <g key={labelIndex}>
                {evaluatedSeries.map((series, seriesIndex) => {
                  const dataPoint = series.data.find(d => String(d.x) === label);
                  if (!dataPoint) return null;

                  const barHeight = ((dataPoint.y / maxValue) * (chartHeight - padding.top - padding.bottom));
                  const x = groupX + seriesIndex * (barWidth + 1);
                  const y = chartHeight - padding.bottom - barHeight;

                  const isHovered = hoveredIndex === labelIndex * 100 + seriesIndex;

                  return (
                    <g key={seriesIndex}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={series.color}
                        opacity={isHovered ? 0.8 : 1}
                        style={{
                          cursor: 'pointer',
                          transition: 'opacity 0.2s'
                        }}
                        onClick={() => handleDataPointClick(dataPoint, seriesIndex)}
                        onMouseEnter={() => setHoveredIndex(labelIndex * 100 + seriesIndex)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                      {props.showDataLabels && (
                        <text
                          x={x + barWidth / 2}
                          y={y - 2}
                          textAnchor="middle"
                          fontSize={props.labelTextSize || 2.5}
                          fill="#374151"
                        >
                          {dataPoint.y}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* X-axis label */}
                <text
                  x={groupX + groupWidth / 2}
                  y={chartHeight - padding.bottom + 15}
                  textAnchor="middle"
                  fontSize={props.labelTextSize || 3}
                  fill="#6b7280"
                  transform={props.labelOrientation === 'vertical' ?
                    `rotate(-90, ${groupX + groupWidth / 2}, ${chartHeight - padding.bottom + 15})` : ''}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          {props.xAxisName && (
            <text
              x={chartWidth / 2}
              y={chartHeight - 10}
              textAnchor="middle"
              fontSize={3.5}
              fill="#374151"
              fontWeight="500"
            >
              {props.xAxisName}
            </text>
          )}
          {props.yAxisName && (
            <text
              x={20}
              y={chartHeight / 2}
              textAnchor="middle"
              fontSize={3.5}
              fill="#374151"
              fontWeight="500"
              transform={`rotate(-90, 20, ${chartHeight / 2})`}
            >
              {props.yAxisName}
            </text>
          )}
        </svg>
      </div>
    );
  };

  const renderLineChart = () => {
    const chartHeight = 300;
    const chartWidth = 100;
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };

    return (
      <div className="relative w-full h-full p-4">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                x2={chartWidth - padding.right}
                y2={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                stroke={props.gridLineColor || '#e5e7eb'}
                strokeWidth="0.2"
              />
              <text
                x={padding.left - 5}
                y={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                textAnchor="end"
                fontSize={props.labelTextSize || 3}
                fill="#6b7280"
                dominantBaseline="middle"
              >
                {Math.round(maxValue * (1 - ratio))}
              </text>
            </g>
          ))}

          {/* Lines and areas */}
          {evaluatedSeries.map((series, seriesIndex) => {
            const points = allLabels.map((label, index) => {
              const dataPoint = series.data.find(d => String(d.x) === label);
              const x = padding.left + (index * (chartWidth - padding.left - padding.right) / (allLabels.length - 1 || 1));
              const y = dataPoint
                ? chartHeight - padding.bottom - ((dataPoint.y / maxValue) * (chartHeight - padding.top - padding.bottom))
                : chartHeight - padding.bottom;
              return { x, y, data: dataPoint };
            });

            const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
            const areaPoints = props.chartType === 'area'
              ? `${padding.left},${chartHeight - padding.bottom} ${linePoints} ${chartWidth - padding.right},${chartHeight - padding.bottom}`
              : '';

            return (
              <g key={seriesIndex}>
                {props.chartType === 'area' && (
                  <polygon
                    points={areaPoints}
                    fill={series.color}
                    opacity={0.2}
                  />
                )}
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((point, pointIndex) => point.data && (
                  <circle
                    key={pointIndex}
                    cx={point.x}
                    cy={point.y}
                    r="1"
                    fill={series.color}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleDataPointClick(point.data!, seriesIndex)}
                    onMouseEnter={() => setHoveredIndex(seriesIndex * 1000 + pointIndex)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {hoveredIndex === seriesIndex * 1000 + pointIndex && props.enableTooltip && (
                      <title>{`${point.data.x}: ${point.data.y}`}</title>
                    )}
                  </circle>
                ))}
              </g>
            );
          })}

          {/* X-axis labels */}
          {allLabels.map((label, index) => {
            const x = padding.left + (index * (chartWidth - padding.left - padding.right) / (allLabels.length - 1 || 1));
            return (
              <text
                key={index}
                x={x}
                y={chartHeight - padding.bottom + 15}
                textAnchor="middle"
                fontSize={props.labelTextSize || 3}
                fill="#6b7280"
              >
                {label}
              </text>
            );
          })}

          {/* Axis labels */}
          {props.xAxisName && (
            <text
              x={chartWidth / 2}
              y={chartHeight - 10}
              textAnchor="middle"
              fontSize={3.5}
              fill="#374151"
              fontWeight="500"
            >
              {props.xAxisName}
            </text>
          )}
          {props.yAxisName && (
            <text
              x={20}
              y={chartHeight / 2}
              textAnchor="middle"
              fontSize={3.5}
              fill="#374151"
              fontWeight="500"
              transform={`rotate(-90, 20, ${chartHeight / 2})`}
            >
              {props.yAxisName}
            </text>
          )}
        </svg>
      </div>
    );
  };

  const renderPieChart = () => {
    const series = evaluatedSeries[0];
    if (!series || series.data.length === 0) {
      return null;
    }

    const total = series.data.reduce((sum, point) => sum + point.y, 0);
    const centerX = 50;
    const centerY = 45;
    const radius = 30;

    let currentAngle = -90;
    const slices = series.data.map((point, index) => {
      const percentage = (point.y / total) * 100;
      const angle = (point.y / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (currentAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      const labelAngle = startAngle + angle / 2;
      const labelRad = (labelAngle * Math.PI) / 180;
      const labelX = centerX + (radius * 0.7) * Math.cos(labelRad);
      const labelY = centerY + (radius * 0.7) * Math.sin(labelRad);

      return { path, point, percentage, labelX, labelY, index };
    });

    return (
      <div className="relative w-full h-full p-4">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {slices.map((slice, index) => {
            const color = props.series[0]?.color || `hsl(${(index * 360) / series.data.length}, 70%, 60%)`;
            const isHovered = hoveredIndex === index;

            return (
              <g key={index}>
                <path
                  d={slice.path}
                  fill={color}
                  opacity={isHovered ? 0.8 : 1}
                  stroke="#fff"
                  strokeWidth="0.2"
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onClick={() => handleDataPointClick(slice.point, 0)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {props.enableTooltip && (
                    <title>{`${slice.point.x}: ${slice.point.y} (${slice.percentage.toFixed(1)}%)`}</title>
                  )}
                </path>
                {props.showDataLabels && slice.percentage > 5 && (
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3"
                    fill="#fff"
                    fontWeight="600"
                  >
                    {slice.percentage.toFixed(0)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const exportChart = () => {
    const data = evaluatedSeries.flatMap(series =>
      series.data.map(point => ({
        series: series.title,
        x: point.x,
        y: point.y
      }))
    );

    const csv = [
      'Series,Label,Value',
      ...data.map(row => `${row.series},${row.x},${row.y}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!props.visible) return null;

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: props.backgroundColor || '#ffffff',
        borderColor: props.borderColor || '#e5e7eb',
        borderWidth: props.borderWidth !== undefined ? `${props.borderWidth}px` : '1px',
        borderRadius: props.borderRadius !== undefined ? `${props.borderRadius}px` : '8px',
        borderStyle: 'solid'
      }}
      className={`flex flex-col overflow-hidden ${props.animateLoading ? 'animate-pulse' : ''}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {props.chartType === 'line' || props.chartType === 'area' ? (
            <LineChart className="w-4 h-4 text-gray-600" />
          ) : props.chartType === 'pie' ? (
            <PieChart className="w-4 h-4 text-gray-600" />
          ) : (
            <BarChart3 className="w-4 h-4 text-gray-600" />
          )}
          <h3 className="font-medium text-gray-900">{props.title || 'Chart'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportChart}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Export data"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        {renderChart()}
      </div>

      {/* Legend */}
      {props.showLegend && evaluatedSeries.length > 0 && (
        <div className={`px-4 py-3 border-t border-gray-200 bg-gray-50 flex ${
          props.legendPosition === 'top' || props.legendPosition === 'bottom' ? 'flex-row' : 'flex-col'
        } gap-4 flex-wrap`}>
          {evaluatedSeries.map((series, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: series.color }}
              />
              <span className="text-sm text-gray-700">{series.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Data Point Info */}
      {selectedDataPoint && (
        <div className="px-4 py-2 border-t border-blue-200 bg-blue-50 text-sm">
          <span className="font-medium text-blue-900">Selected:</span>{' '}
          <span className="text-blue-700">
            {selectedDataPoint.x} = {selectedDataPoint.y}
          </span>
        </div>
      )}
    </div>
  );
};
