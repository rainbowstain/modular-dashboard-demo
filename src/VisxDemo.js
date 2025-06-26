import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Typography, 
  Space, 
  Tag,
  Switch,
  theme,
  ConfigProvider,
  Carousel,
  Badge
} from 'antd';
import { 
  ThunderboltOutlined, 
  BarChartOutlined,
  HeatMapOutlined,
  LineChartOutlined,
  EnvironmentOutlined,
  CameraOutlined
} from '@ant-design/icons';

// VISX imports
import { extent, max, min } from '@visx/vendor/d3-array';
import * as allCurves from '@visx/curve';
import { Group } from '@visx/group';
import { LinePath, AreaClosed, Bar } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { MarkerArrow, MarkerCircle } from '@visx/marker';
import { LinearGradient } from '@visx/gradient';
import { withTooltip, Tooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { HeatmapCircle, HeatmapRect } from '@visx/heatmap';
import { AreaStack } from '@visx/shape';

import { Brush } from '@visx/brush';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { SplitLinePath } from '@visx/shape';

const { Title, Text } = Typography;

// Hook personalizado para detectar tamaño del contenedor
const useContainerDimensions = (ref) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width: width || 600, height: height || 400 });
      }
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => resizeObserver.disconnect();
  }, [ref]);

  return dimensions;
};

// Componente wrapper responsive para gráficos
const ResponsiveChartContainer = ({ children, minHeight = 250 }) => {
  const containerRef = useRef(null);
  const { width, height } = useContainerDimensions(containerRef);

  return (
    <div 
      ref={containerRef} 
      className="chart-container"
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: `${minHeight}px`,
        position: 'relative'
      }}
    >
      {width > 0 && height > 0 && children({ width, height })}
    </div>
  );
};

// Generar datos de sensores más complejos para la demo
const generateAdvancedSensorData = () => {
  const sensors = [
    { id: 'temp', name: 'Temperatura', unit: '°C', color: '#ff6b6b', baseValue: 22 },
    { id: 'humidity', name: 'Humedad', unit: '%', color: '#4ecdc4', baseValue: 65 },
    { id: 'light', name: 'Radiación PAR', unit: 'µmol', color: '#ffe66d', baseValue: 800 },
    { id: 'pressure', name: 'Presión', unit: 'hPa', color: '#a8e6cf', baseValue: 1013 },
    { id: 'co2', name: 'CO₂', unit: 'ppm', color: '#ff8b94', baseValue: 400 },
    { id: 'soil', name: 'Humedad Suelo', unit: 'VWC', color: '#ffd93d', baseValue: 45 }
  ];

  const data = [];
  const now = new Date();
  const pointsPerSensor = 200;

  sensors.forEach(sensor => {
    for (let i = 0; i < pointsPerSensor; i++) {
      const date = new Date(now.getTime() - (pointsPerSensor - i) * 60 * 60 * 1000);
      const hour = date.getHours();
      
      let value = sensor.baseValue;
      
      // Patrones realistas por tipo de sensor
      if (sensor.id === 'temp') {
        const dailyCycle = Math.sin((hour / 24) * 2 * Math.PI - Math.PI/2) * 8;
        const noise = (Math.random() - 0.5) * 3;
        value = sensor.baseValue + dailyCycle + noise;
      } else if (sensor.id === 'humidity') {
        const dailyCycle = Math.sin((hour / 24) * 2 * Math.PI + Math.PI/2) * 15;
        const noise = (Math.random() - 0.5) * 8;
        value = Math.max(30, Math.min(90, sensor.baseValue + dailyCycle + noise));
      } else if (sensor.id === 'light') {
        if (hour >= 6 && hour <= 18) {
          const solarCurve = Math.sin(((hour - 6) / 12) * Math.PI);
          const clouds = Math.random() < 0.3 ? Math.random() * 0.4 : 0.1;
          value = sensor.baseValue * solarCurve * (1 - clouds);
        } else {
          value = Math.random() * 50;
        }
      } else {
        const trend = Math.sin((i / pointsPerSensor) * 2 * Math.PI) * (sensor.baseValue * 0.1);
        const noise = (Math.random() - 0.5) * (sensor.baseValue * 0.05);
        value = sensor.baseValue + trend + noise;
      }

      data.push({
        id: `${sensor.id}_${i}`,
        sensorId: sensor.id,
        sensorName: sensor.name,
        value: Math.round(value * 100) / 100,
        date,
        hour,
        day: Math.floor(i / 24),
        color: sensor.color,
        unit: sensor.unit,
        x: Math.random() * 2 + 0.5, // Para scatter plot
        y: Math.random() * 1.5 + 0.5
      });
    }
  });

  return data;
};

// Generar datos para heatmap (temperatura por zona y hora)
const generateHeatmapData = () => {
  const zones = 8; // 8 zonas del invernadero
  const hours = 24;
  const data = [];

  for (let zone = 0; zone < zones; zone++) {
    const zoneData = [];
    for (let hour = 0; hour < hours; hour++) {
      const baseTemp = 20;
      const dailyCycle = Math.sin((hour / 24) * 2 * Math.PI - Math.PI/2) * 6;
      const zoneVariation = (zone % 2) * 2; // Algunas zonas más calientes
      const noise = (Math.random() - 0.5) * 2;
      
      const temperature = baseTemp + dailyCycle + zoneVariation + noise;
      
      zoneData.push({
        hour,
        zone,
        temperature: Math.round(temperature * 10) / 10,
        count: Math.round(temperature) // Para el heatmap
      });
    }
    data.push({ zone, data: zoneData });
  }

  return data;
};

// Componente Curves Demo simplificado
const CurvesDemo = withTooltip(({ width, height, data, showTooltip, hideTooltip, tooltipOpen, tooltipData, tooltipLeft, tooltipTop }) => {
  const [selectedSensors, setSelectedSensors] = useState(['temp', 'humidity', 'light']);
  const svgRef = useRef(null);

  // Ajustar dimensiones para aprovechar mejor el espacio
  const margin = { top: 15, right: 15, bottom: 35, left: 45 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom - 50; // Espacio para el selector

  const filteredData = useMemo(() => {
    const grouped = {};
    selectedSensors.forEach(sensorId => {
      grouped[sensorId] = data.filter(d => d.sensorId === sensorId).slice(0, 50);
    });
    return grouped;
  }, [data, selectedSensors]);

  const allFilteredData = useMemo(() => 
    Object.values(filteredData).flat(), [filteredData]
  );

  const xScale = scaleTime({
    range: [0, chartWidth],
    domain: extent(allFilteredData, d => d.date),
  });

  const yScale = scaleLinear({
    range: [chartHeight, 0],
    domain: extent(allFilteredData, d => d.value),
    nice: true,
  });

  const colors = {
    temp: '#ff4757',
    humidity: '#2ed573', 
    light: '#ffa502',
    pressure: '#70a1ff',
    co2: '#ff6b9d',
    soil: '#f1c40f'
  };

  const handleMouseMove = useCallback((event) => {
    if (!svgRef.current) return;
    const point = localPoint(svgRef.current, event);
    if (!point) return;

    const mouseX = point.x - margin.left;
    const mouseY = point.y - margin.top;
    
    // Encontrar el punto más cercano considerando tanto X como Y
    let closestPoint = null;
    let minDistance = Infinity;

    allFilteredData.forEach(d => {
      const dataX = xScale(d.date);
      const dataY = yScale(d.value);
      
      // Calcular distancia euclidiana con peso mayor en X para seguir las líneas mejor
      const distanceX = Math.abs(dataX - mouseX);
      const distanceY = Math.abs(dataY - mouseY);
      const totalDistance = Math.sqrt(Math.pow(distanceX * 0.8, 2) + Math.pow(distanceY, 2));
      
      if (totalDistance < minDistance) {
        minDistance = totalDistance;
        closestPoint = d;
      }
    });

    if (closestPoint) {
      showTooltip({
        tooltipLeft: xScale(closestPoint.date) + margin.left,
        tooltipTop: yScale(closestPoint.value) + margin.top,
        tooltipData: closestPoint,
      });
    }
  }, [xScale, yScale, showTooltip, allFilteredData, margin]);

  const sensorNames = {
    temp: 'Temperatura',
    humidity: 'Humedad',
    light: 'Radiación',
    pressure: 'Presión',
    co2: 'CO₂',
    soil: 'Suelo'
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* Selector de sensores compacto */}
      <div style={{ marginBottom: 12, paddingLeft: 8 }}>
        <Space wrap size="small">
          <Text style={{ color: '#ccc', fontSize: '11px' }}>Sensores:</Text>
          {Object.keys(colors).map(key => (
            <Tag
              key={key}
              color={selectedSensors.includes(key) ? colors[key] : 'default'}
              style={{ 
                cursor: 'pointer', 
                fontSize: '10px',
                padding: '2px 6px',
                borderColor: colors[key],
                backgroundColor: selectedSensors.includes(key) ? colors[key] + '20' : 'transparent'
              }}
              onClick={() => {
                if (selectedSensors.includes(key)) {
                  if (selectedSensors.length > 1) {
                    setSelectedSensors(selectedSensors.filter(k => k !== key));
                  }
                } else {
                  setSelectedSensors([...selectedSensors, key]);
                }
              }}
            >
              {sensorNames[key]}
            </Tag>
          ))}
        </Space>
      </div>

      <svg width={width} height={height - 50} ref={svgRef}>
        <LinearGradient id="curve-bg" from="#181f2a" to="#232b3e" />
        <rect width={width} height={height - 50} fill="transparent" rx={8} />
        
        <MarkerCircle id="marker-circle-improved" fill="#64748b" size={3} refX={1.5} />

        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={chartWidth}
            height={chartHeight}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="2,3"
            numTicks={4}
          />
          <GridColumns
            scale={xScale}
            width={chartWidth}
            height={chartHeight}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="2,3"
            numTicks={5}
          />

          {Object.entries(filteredData).map(([sensorId, sensorData]) => (
            <Group key={sensorId}>
              {/* Área de fondo sutil */}
              <AreaClosed
                data={sensorData}
                x={d => xScale(d.date)}
                y={d => yScale(d.value)}
                yScale={yScale}
                fill={colors[sensorId]}
                fillOpacity={0.12}
                curve={allCurves.curveBasis}
              />
              
              {/* Puntos de datos (siempre visibles) */}
              {sensorData.map((d, j) => (
                j % 4 === 0 && (
                  <circle
                    key={j}
                    className="data-point"
                    r={2.5}
                    cx={xScale(d.date)}
                    cy={yScale(d.value)}
                    fill={colors[sensorId]}
                    fillOpacity={0.8}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={1}
                  />
                )
              ))}
              
              {/* Línea principal usando basis */}
              <LinePath
                className="chart-line"
                data={sensorData}
                x={d => xScale(d.date)}
                y={d => yScale(d.value)}
                stroke={colors[sensorId]}
                strokeWidth={2.5}
                curve={allCurves.curveBasis}
                strokeOpacity={0.9}
              />
            </Group>
          ))}

          {/* Overlay invisible para tooltips */}
          <rect
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={hideTooltip}
          />

          <AxisBottom
            top={chartHeight}
            scale={xScale}
            numTicks={4}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }}
            tickFormat={(d) => d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
          />
          <AxisLeft
            scale={yScale}
            numTicks={4}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 9, textAnchor: 'end', dx: -4 }}
            tickFormat={d => d.toFixed(1)}
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <div style={{ 
          position: 'absolute',
          left: tooltipLeft + 10,
          top: tooltipTop + 10,
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          <div style={{ 
            background: '#1e293b', 
            color: '#fff', 
            padding: '8px 12px', 
            borderRadius: '6px',
            border: '1px solid #374151',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontWeight: 'bold', color: colors[tooltipData.sensorId] }}>
              {tooltipData.sensorName}
            </div>
            <div>Valor: {tooltipData.value} {tooltipData.unit}</div>
            <div>Fecha: {tooltipData.date.toLocaleDateString('es-ES')}</div>
            <div>Hora: {tooltipData.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      )}
    </div>
  );
});

// Componente Heatmap optimizado
const HeatmapDemo = withTooltip(({ width, height, data, showTooltip, hideTooltip, tooltipOpen, tooltipData, tooltipLeft, tooltipTop }) => {
  // Usar datos pasados como prop en lugar de generar nuevos
  const [showCircles, setShowCircles] = useState(true);
  const svgRef = useRef(null);

  // Ajustar dimensiones para aprovechar mejor el espacio
  const margin = { top: 15, right: 15, bottom: 50, left: 60 };
  const legendWidth = 70;
  const chartWidth = width - margin.left - margin.right - legendWidth;
  const chartHeight = height - margin.top - margin.bottom - 50; // Espacio para controles

  const maxTemp = max(data.flatMap(d => d.data), d => d.temperature);
  const minTemp = min(data.flatMap(d => d.data), d => d.temperature);

  const xScale = scaleLinear({
    range: [0, chartWidth],
    domain: [-0.5, 23.5],
  });

  const yScale = scaleLinear({
    range: [chartHeight, 0],
    domain: [-0.5, 7.5],
  });

  const colorScale = scaleLinear({
    domain: [minTemp, (minTemp + maxTemp) / 2, maxTemp],
    range: ['#1e3a8a', '#f59e0b', '#dc2626'],
  });

  const cellWidth = chartWidth / 24;
  const cellHeight = chartHeight / 8;

  const handleMouseMove = useCallback((event) => {
    if (!svgRef.current) return;
    const point = localPoint(svgRef.current, event);
    if (!point) return;

    const adjustedX = point.x - margin.left;
    const adjustedY = point.y - margin.top;
    
    if (adjustedX < 0 || adjustedY < 0) return;

    const hour = Math.round(xScale.invert(adjustedX));
    const zone = Math.round(yScale.invert(adjustedY));

    if (hour >= 0 && hour < 24 && zone >= 0 && zone < 8) {
      const cellData = data[zone]?.data[hour];
      if (cellData) {
        showTooltip({
          tooltipLeft: point.x,
          tooltipTop: point.y,
          tooltipData: cellData,
        });
      }
    }
  }, [xScale, yScale, showTooltip, data, margin]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ marginBottom: 8, paddingLeft: 6 }}>
        <Space size="small" style={{ flexWrap: 'wrap' }}>
          <Switch 
            checked={showCircles} 
            onChange={setShowCircles}
            checkedChildren="●"
            unCheckedChildren="■"
            size="small"
          />
          <Text style={{ color: '#ccc', fontSize: '10px' }}>
            🌡️ Temperatura por zona/hora
          </Text>
          <Text style={{ color: '#64748b', fontSize: '9px' }}>
            {minTemp.toFixed(1)}°C - {maxTemp.toFixed(1)}°C
          </Text>
        </Space>
      </div>

      <svg width={width} height={height - 50} ref={svgRef}>
        <LinearGradient id="heatmap-bg-improved" from="#181f2a" to="#232b3e" />
        <rect width={width} height={height - 50} fill="transparent" rx={8} />

        <Group left={margin.left} top={margin.top}>
          {data.map((zoneData, zoneIndex) =>
            zoneData.data.map((cell, hourIndex) => {
              const x = xScale(hourIndex);
              const y = yScale(zoneIndex);
              const color = colorScale(cell.temperature);
              const intensity = (cell.temperature - minTemp) / (maxTemp - minTemp);

              if (showCircles) {
                return (
                  <g key={`${zoneIndex}-${hourIndex}`}>
                    <circle
                      className="heat-cell"
                      cx={x}
                      cy={y}
                      r={Math.min(cellWidth, cellHeight) / 3.2}
                      fill={color}
                      opacity={0.8 + intensity * 0.2}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={0.5}
                    />
                  </g>
                );
              } else {
                return (
                  <g key={`${zoneIndex}-${hourIndex}`}>
                    <rect
                      className="heat-cell"
                      x={x - cellWidth / 2 + 1}
                      y={y - cellHeight / 2 + 1}
                      width={cellWidth - 2}
                      height={cellHeight - 2}
                      fill={color}
                      opacity={0.8 + intensity * 0.2}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={0.5}
                      rx={2}
                    />
                    <text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill="rgba(255, 255, 255, 0.7)"
                      fontSize={Math.max(12, Math.min(cellWidth, cellHeight) / 3.3)}
                      fontWeight="700"
                      style={{ 
                        textShadow: '0 0 2px rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8)',
                        userSelect: 'none'
                      }}
                    >
                      {Math.round(cell.temperature)}
                    </text>
                  </g>
                );
              }
            })
          )}

          {/* Overlay para tooltips */}
          <rect
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={hideTooltip}
          />

          <AxisBottom
            top={chartHeight}
            scale={xScale}
            tickValues={[0, 3, 6, 9, 12, 15, 18, 21]}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' }}
            tickFormat={d => `${d}h`}
          />
          <AxisLeft
            scale={yScale}
            tickValues={[0, 1, 2, 3, 4, 5, 6, 7]}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 9, textAnchor: 'end', dx: -4 }}
            tickFormat={d => `Zona ${d + 1}`}
          />
        </Group>

        {/* Leyenda de temperatura simplificada */}
        <Group left={margin.left + chartWidth + 15} top={margin.top}>
          {/* Fondo minimalista */}
          <rect 
            x={-5} 
            y={-5} 
            width={40} 
            height={chartHeight + 10} 
            fill="rgba(10, 10, 10, 0.9)" 
            rx={6} 
            stroke="rgba(255,255,255,0.15)" 
            strokeWidth={1}
          />
          
          {/* Gradiente extendido por toda la altura */}
          <defs>
            <linearGradient id="temp-legend-gradient-extended" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          
          <rect
            x={2}
            y={5}
            width={26}
            height={chartHeight - 10}
            fill="url(#temp-legend-gradient-extended)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1.5}
            rx={4}
          />

          {/* Temperaturas dentro de la barra */}
          <text
            x={15}
            y={15}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={9}
            fontWeight="700"
            style={{ 
              textShadow: '0 0 3px rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9)',
              userSelect: 'none'
            }}
          >
            {maxTemp.toFixed(1)}°
          </text>
          <text
            x={15}
            y={chartHeight - 8}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={9}
            fontWeight="700"
            style={{ 
              textShadow: '0 0 3px rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9)',
              userSelect: 'none'
            }}
          >
            {minTemp.toFixed(1)}°
          </text>
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <div style={{ 
          position: 'absolute',
          left: tooltipLeft + 10,
          top: tooltipTop + 10,
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          <div style={{ 
            background: '#1e293b', 
            color: '#fff', 
            padding: '8px 12px', 
            borderRadius: '6px',
            border: '1px solid #374151',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>
              Zona {tooltipData.zone + 1} - {tooltipData.hour}:00h
            </div>
            <div>Temperatura: {tooltipData.temperature}°C</div>
            <div style={{ color: tooltipData.temperature > 24 ? '#dc2626' : 
                               tooltipData.temperature > 20 ? '#f59e0b' : '#1e3a8a' }}>
              Estado: {tooltipData.temperature > 24 ? 'Alto' : 
                       tooltipData.temperature > 20 ? 'Normal' : 'Bajo'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});



// Componente Stacked Areas optimizado
const StackedAreasDemo = withTooltip(({ width, height, data, showTooltip, hideTooltip, tooltipOpen, tooltipData, tooltipLeft, tooltipTop }) => {
  const [selectedKeys, setSelectedKeys] = useState(['temp', 'humidity', 'light']);
  const svgRef = useRef(null);

  // Ajustar dimensiones para aprovechar mejor el espacio
  const margin = { top: 15, right: 15, bottom: 35, left: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom - 70; // Espacio para controles

  const processedData = useMemo(() => {
    const grouped = {};
    data.forEach(d => {
      const hour = d.date.getHours();
      if (!grouped[hour]) {
        grouped[hour] = { hour, temp: 0, humidity: 0, light: 0, pressure: 0, co2: 0, soil: 0 };
      }
      grouped[hour][d.sensorId] = (grouped[hour][d.sensorId] || 0) + d.value;
    });

    // Normalizar los datos para mejor visualización
    return Object.values(grouped).sort((a, b) => a.hour - b.hour).map(d => ({
      ...d,
      temp: d.temp / 10,
      humidity: d.humidity / 100,
      light: d.light / 1000,
      pressure: d.pressure / 100,
      co2: d.co2 / 100,
      soil: d.soil / 10
    }));
  }, [data]);

  const colors = {
    temp: '#ef4444',
    humidity: '#06b6d4', 
    light: '#f59e0b',
    pressure: '#8b5cf6',
    co2: '#ec4899',
    soil: '#84cc16'
  };

  const xScale = scaleLinear({
    range: [0, chartWidth],
    domain: [0, 23],
  });

  const yScale = scaleLinear({
    range: [chartHeight, 0],
    domain: [0, max(processedData, d => selectedKeys.reduce((sum, key) => sum + d[key], 0)) * 1.1],
    nice: true,
  });

  const handleMouseMove = useCallback((event) => {
    if (!svgRef.current) return;
    const point = localPoint(svgRef.current, event);
    if (!point) return;

    const hour = Math.round(xScale.invert(point.x - margin.left));
    const hourData = processedData.find(d => d.hour === hour);
    
    if (hourData) {
      showTooltip({
        tooltipLeft: xScale(hour) + margin.left,
        tooltipTop: point.y,
        tooltipData: { ...hourData, hour },
      });
    }
  }, [xScale, showTooltip, processedData, margin]);

  const sensorNames = {
    temp: 'Temperatura',
    humidity: 'Humedad',
    light: 'Radiación',
    pressure: 'Presión',
    co2: 'CO₂',
    soil: 'Suelo'
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ marginBottom: 12, paddingLeft: 8 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text style={{ color: '#ccc', fontSize: '11px' }}>
            📊 Distribución normalizada de sensores por hora del día
          </Text>
          <Space wrap size="small">
            {Object.keys(colors).map(key => (
              <Tag
                key={key}
                color={selectedKeys.includes(key) ? colors[key] : 'default'}
                style={{ 
                  cursor: 'pointer',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderColor: colors[key],
                  backgroundColor: selectedKeys.includes(key) ? colors[key] + '20' : 'transparent'
                }}
                onClick={() => {
                  if (selectedKeys.includes(key)) {
                    if (selectedKeys.length > 1) {
                      setSelectedKeys(selectedKeys.filter(k => k !== key));
                    }
                  } else {
                    setSelectedKeys([...selectedKeys, key]);
                  }
                }}
              >
                {sensorNames[key]}
              </Tag>
            ))}
          </Space>
        </Space>
      </div>

      <svg width={width} height={height - 70} ref={svgRef}>
        <LinearGradient id="stacked-bg-improved" from="#181f2a" to="#232b3e" />
        <rect width={width} height={height - 70} fill="transparent" rx={8} />

        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={chartWidth}
            height={chartHeight}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2,3"
            numTicks={4}
          />

          <AreaStack
            data={processedData}
            keys={selectedKeys}
            x={d => xScale(d.data.hour)}
            y0={d => yScale(d[0])}
            y1={d => yScale(d[1])}
          >
            {({ stacks, path }) =>
              stacks.map((stack) => (
                <path
                  key={stack.key}
                  d={path(stack) || ''}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                  fill={colors[stack.key]}
                  fillOpacity={0.8}
                />
              ))
            }
          </AreaStack>

          {/* Overlay para tooltips */}
          <rect
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={hideTooltip}
          />

          <AxisBottom
            top={chartHeight}
            scale={xScale}
            numTicks={6}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }}
            tickFormat={d => `${d}:00`}
          />
          <AxisLeft
            scale={yScale}
            numTicks={4}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 9, textAnchor: 'end', dx: -4 }}
            tickFormat={d => d.toFixed(1)}
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <div style={{ 
          position: 'absolute',
          left: tooltipLeft + 10,
          top: tooltipTop + 10,
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          <div style={{ 
            background: '#1e293b', 
            color: '#fff', 
            padding: '8px 12px', 
            borderRadius: '6px',
            border: '1px solid #374151',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
              {tooltipData.hour}:00 hrs
            </div>
            {selectedKeys.map(key => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: colors[key] }}>
                  {sensorNames[key]}:
                </span>
                <span>{tooltipData[key].toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Componente Split Line Paths optimizado - Para cambios críticos de temperatura
const SplitLinePathDemo = ({ width, height, data }) => {
  const [showCriticalChanges, setShowCriticalChanges] = useState(true);
  
  // Ajustar dimensiones para aprovechar mejor el espacio
  const margin = { top: 15, right: 20, bottom: 35, left: 45 };
  const infoWidth = 140;
  const chartWidth = width - margin.left - margin.right - infoWidth;
  const chartHeight = height - margin.top - margin.bottom - 60; // Espacio para controles
  
  const tempData = useMemo(() => {
    const filtered = data.filter(d => d.sensorId === 'temp').slice(0, 80);
    const segments = [];
    let currentSegment = [];
    let criticalPoints = [];
    
    for (let i = 0; i < filtered.length; i++) {
      const point = { 
        x: i * 5, 
        y: filtered[i].value * 12,
        originalValue: filtered[i].value,
        date: filtered[i].date,
        isCritical: false
      };
      
      // Detectar cambios críticos (>2.5°C)
      if (i > 0) {
        const tempChange = Math.abs(filtered[i].value - filtered[i-1].value);
        if (tempChange > 2.5) {
          point.isCritical = true;
          criticalPoints.push(point);
          
          // Finalizar segmento actual y comenzar uno nuevo
          if (currentSegment.length > 0) {
            currentSegment.push(point);
            segments.push({ points: [...currentSegment], type: 'normal' });
            currentSegment = [point];
          }
        }
      }
      
      currentSegment.push(point);
      
      // Crear segmentos cada 15 puntos para mejor performance
      if (currentSegment.length >= 15 && !point.isCritical) {
        segments.push({ points: [...currentSegment], type: 'normal' });
        currentSegment = [currentSegment[currentSegment.length - 1]]; // Mantener continuidad
      }
    }
    
    if (currentSegment.length > 0) {
      segments.push({ points: currentSegment, type: 'normal' });
    }
    
    return { segments, criticalPoints };
  }, [data]);

  const xScale = scaleLinear({
    range: [0, chartWidth],
    domain: [0, 400],
  });

  const yScale = scaleLinear({
    range: [chartHeight, 0],
    domain: [150, 420],
    nice: true,
  });

  const getX = (d) => d.x;
  const getY = (d) => d.y;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ marginBottom: 12, paddingLeft: 8 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text style={{ color: '#ccc', fontSize: '11px' }}>
            🔥 Detección automática de cambios críticos de temperatura (&gt;2.5°C)
          </Text>
          <Space>
            <Switch 
              checked={showCriticalChanges} 
              onChange={setShowCriticalChanges}
              checkedChildren="Análisis Crítico"
              unCheckedChildren="Vista Simple"
              size="small"
            />
            <Text style={{ color: '#64748b', fontSize: '10px' }}>
              {tempData.criticalPoints.length} cambios críticos detectados
            </Text>
          </Space>
        </Space>
      </div>

      <svg width={width} height={height - 60}>
        <LinearGradient id="split-bg-improved" from="#181f2a" to="#232b3e" />
        <rect width={width} height={height - 60} fill="transparent" rx={8} />

        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={chartWidth}
            height={chartHeight}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2,3"
            numTicks={4}
          />

          {showCriticalChanges ? (
            <g>
              {/* Renderizar segmentos normales */}
              {tempData.segments.map((segment, index) => (
                <LinePath
                  key={index}
                  data={segment.points}
                  x={d => xScale(getX(d))}
                  y={d => yScale(getY(d))}
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  strokeOpacity={0.8}
                />
              ))}
              
              {/* Resaltar puntos críticos */}
              {tempData.criticalPoints.map((point, i) => (
                <g key={i} className="critical-point">
                  <circle
                    cx={xScale(getX(point))}
                    cy={yScale(getY(point))}
                    r={8}
                    fill="#dc2626"
                    fillOpacity={0.2}
                  />
                  <circle
                    cx={xScale(getX(point))}
                    cy={yScale(getY(point))}
                    r={4}
                    fill="#dc2626"
                    stroke="#fca5a5"
                    strokeWidth={2}
                  />
                  {/* Línea de alerta vertical */}
                  <line
                    x1={xScale(getX(point))}
                    y1={yScale(getY(point)) - 20}
                    x2={xScale(getX(point))}
                    y2={yScale(getY(point)) + 20}
                    stroke="#dc2626"
                    strokeWidth={1}
                    strokeDasharray="3,2"
                    opacity={0.6}
                  />
                </g>
              ))}
            </g>
          ) : (
            <LinePath
              data={tempData.segments.flatMap(s => s.points)}
              x={d => xScale(getX(d))}
              y={d => yScale(getY(d))}
              stroke="#06b6d4"
              strokeWidth={2}
              strokeOpacity={0.9}
            />
          )}

          <AxisBottom
            top={chartHeight}
            scale={xScale}
            numTicks={6}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }}
            tickFormat={d => `${Math.floor(d/20)}h`}
          />
          <AxisLeft
            scale={yScale}
            numTicks={4}
            stroke="#64748b"
            tickStroke="#64748b"
            tickLabelProps={{ fill: '#94a3b8', fontSize: 9, textAnchor: 'end', dx: -4 }}
            tickFormat={d => `${(d/12).toFixed(1)}°C`}
          />
        </Group>

        {/* Panel de información optimizado */}
        <Group left={margin.left + chartWidth + 10} top={margin.top + 10}>
          <rect x={0} y={0} width={130} height={100} fill="rgba(5,5,5,0.95)" rx={6} stroke="rgba(255,255,255,0.1)" />
          <text x={8} y={16} fill="#f59e0b" fontSize={10} fontWeight="bold">🚨 Monitor Térmico</text>
          
          {/* Estado actual */}
          <circle cx={15} cy={32} r={3} fill="#06b6d4" />
          <text x={22} y={36} fill="#94a3b8" fontSize={8}>Normal (±2.5°C)</text>
          
          <circle cx={15} cy={50} r={3} fill="#dc2626" />
          <text x={22} y={54} fill="#94a3b8" fontSize={8}>Crítico (&gt;2.5°C)</text>
          
          <circle cx={15} cy={68} r={3} fill="#f59e0b" />
          <text x={22} y={72} fill="#94a3b8" fontSize={8}>En observación</text>
          
          {/* Estadísticas */}
          <text x={8} y={90} fill="#64748b" fontSize={8}>
            Total alertas: {tempData.criticalPoints.length}
          </text>
        </Group>
      </svg>
    </div>
  );
};

// Componente de OpenStreetMap estándar (no satelital)
const GoogleMapComponent = () => (
  <div style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden', minHeight: '250px', background: '#1a1a1a' }}>
    <iframe
      title="San Pedro de Atacama"
      width="100%"
      height="100%"
      style={{ border: 0, minHeight: '250px' }}
      loading="lazy"
      allowFullScreen
      src="https://www.openstreetmap.org/export/embed.html?bbox=-68.210%2C-22.915%2C-68.188%2C-22.902&layer=mapnik&marker=-22.9083%2C-68.1992"
    ></iframe>
  </div>
);

// Componente de Galería de Plantas
const PlantGallery = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Fotos reales de plantas/flores (Unsplash, libres de uso)
  const plantData = [
    {
      id: 1,
      name: "Quinoa Andina",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      cswi: 0.87,
      ndvi: 0.76,
      temp: 18.5,
      status: "OK"
    },
    {
      id: 2,
      name: "Flor del Desierto",
      image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
      cswi: 0.92,
      ndvi: 0.82,
      temp: 16.2,
      status: "OK"
    },
    {
      id: 3,
      name: "Cactus Atacameño",
      image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=400&q=80",
      cswi: 0.68,
      ndvi: 0.71,
      temp: 22.1,
      status: "Alerta"
    },
    {
      id: 4,
      name: "Lirio Silvestre",
      image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
      cswi: 0.95,
      ndvi: 0.89,
      temp: 19.8,
      status: "OK"
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK': return '#2ed573';
      case 'Alerta': return '#ff6b6b';
      case 'Crítico': return '#ff4757';
      default: return '#666';
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Carousel 
        dots={true} 
        autoplay 
        autoplaySpeed={4000}
        beforeChange={(from, to) => setCurrentSlide(to)}
        style={{ height: '100%' }}
      >
        {plantData.map((plant, index) => (
          <div key={plant.id} style={{ height: '100%' }}>
            <div style={{ 
              position: 'relative',
              width: '100%',
              height: '100%',
              minHeight: '300px',
              maxHeight: '400px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#222'
            }}>
              {/* Imagen que ocupa todo el contenedor */}
              <img
                src={plant.image}
                alt={plant.name}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              
              {/* Overlay con información de la planta - siempre abajo */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
                color: '#fff',
                padding: '24px 16px 16px',
                borderRadius: '0 0 8px 8px'
              }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  marginBottom: '10px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                }}>
                  {plant.name}
                </div>
                
                {/* Métricas en una fila */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Space size={16}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#ccc', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>CSWI</div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#00d4ff', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                        {plant.cswi.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#ccc', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>NDVI</div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#4ecdc4', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                        {plant.ndvi.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#ccc', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Tmp</div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffe66d', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                        {plant.temp}°C
                      </div>
                    </div>
                  </Space>
                  
                  <Badge 
                    color={getStatusColor(plant.status)}
                    text={
                      <span style={{ 
                        color: getStatusColor(plant.status), 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        textShadow: '0 1px 2px rgba(0,0,0,0.9)'
                      }}>
                        {plant.status}
                      </span>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  );
};

// Componente Principal de la Demo
const VisxDemo = () => {
  const [data, setData] = useState(() => generateAdvancedSensorData());
  const [heatmapData, setHeatmapData] = useState(() => generateHeatmapData());
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  
  // Estado para controlar qué secciones están visibles
  const [visibleSections, setVisibleSections] = useState({
    curves: true,
    heatmap: true,
    stacked: true,
    critical: true,
    map: true,
    gallery: true
  });
  
  // Estado para sensores en tiempo real
  const [realTimeSensors, setRealTimeSensors] = useState({
    temperatura: { value: 17, unit: '°C', status: 'normal' },
    humedadAire: { value: 65, unit: '%', status: 'normal' },
    humedadVolumetrica: { value: 96, unit: 'VWC', status: 'normal' },
    radiacionPAR: { value: 1043, unit: 'µmol/m²/s', status: 'normal' },
    onOff1: { value: false, unit: '', status: 'normal' },
    onOff2: { value: true, unit: '', status: 'normal' }
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Configuración de las secciones
  const sections = [
    {
      key: 'curves',
      title: 'Curvas & Tendencias',
      icon: LineChartOutlined,
      color: '#4ecdc4',
      component: (width, height) => <CurvesDemo width={width} height={height} data={data} />
    },
    {
      key: 'heatmap',
      title: 'Mapa de Calor',
      icon: HeatMapOutlined,
      color: '#ff6b6b',
      component: (width, height) => <HeatmapDemo width={width} height={height} data={heatmapData} />
    },
    {
      key: 'stacked',
      title: 'Áreas Apiladas',
      icon: BarChartOutlined,
      color: '#ffe66d',
      component: (width, height) => <StackedAreasDemo width={width} height={height} data={data} />
    },
    {
      key: 'critical',
      title: 'Cambios Críticos',
      icon: ThunderboltOutlined,
      color: '#a8e6cf',
      component: (width, height) => <SplitLinePathDemo width={width} height={height} data={data} />
    },
    {
      key: 'map',
      title: 'Mapa',
      icon: EnvironmentOutlined,
      color: '#00d4ff',
      component: () => <GoogleMapComponent />
    },
    {
      key: 'gallery',
      title: 'Galería',
      icon: CameraOutlined,
      color: '#84cc16',
      component: () => <PlantGallery />
    }
  ];

  // Función para alternar visibilidad de secciones
  const toggleSection = (sectionKey) => {
    setVisibleSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Calcular columnas dinámicamente
  const visibleCount = Object.values(visibleSections).filter(Boolean).length;
  const getColumnSpan = () => {
    if (visibleCount === 1) return 24; // Toda la pantalla
    if (visibleCount === 2) return 24; // Uno arriba, otro abajo
    if (visibleCount === 3) return 12; // 2 arriba (12 cada uno), 1 abajo (24)
    if (visibleCount === 4) return 12; // 2x2 (12 cada uno)
    if (visibleCount === 5) return 8;  // 3 arriba (8 cada uno), 2 abajo (12 cada uno)
    return 8; // 6 secciones = 3x2 (8 cada uno)
  };

  // Función para obtener el span específico para cada sección visible
  const getSpecificColumnSpan = (index, totalVisible) => {
    if (totalVisible === 1) return 24;
    if (totalVisible === 2) return 24;
    if (totalVisible === 3) {
      return index < 2 ? 12 : 24; // Primeras 2: 12, tercera: 24
    }
    if (totalVisible === 4) return 12;
    if (totalVisible === 5) {
      return index < 3 ? 8 : 12; // Primeras 3: 8, últimas 2: 12
    }
    return 8; // 6 secciones
  };

  // Función para generar valores aleatorios por sensor
  const generateRandomValue = (sensorType, currentValue) => {
    switch (sensorType) {
      case 'temperatura':
        const tempVariation = (Math.random() - 0.5) * 6; // ±3°C
        const newTemp = Math.round((currentValue + tempVariation) * 10) / 10;
        const clampedTemp = Math.max(5, Math.min(35, newTemp));
        return {
          value: clampedTemp,
          status: clampedTemp > 25 ? 'high' : clampedTemp < 10 ? 'low' : 'normal'
        };
      
      case 'humedadAire':
        const humVariation = (Math.random() - 0.5) * 20; // ±10%
        const newHum = Math.round(currentValue + humVariation);
        const clampedHum = Math.max(20, Math.min(95, newHum));
        return {
          value: clampedHum,
          status: clampedHum > 80 ? 'high' : clampedHum < 30 ? 'low' : 'normal'
        };
      
      case 'humedadVolumetrica':
        const vwcVariation = (Math.random() - 0.5) * 10; // ±5 VWC
        const newVwc = Math.round(currentValue + vwcVariation);
        const clampedVwc = Math.max(50, Math.min(150, newVwc));
        return {
          value: clampedVwc,
          status: clampedVwc > 120 ? 'high' : clampedVwc < 70 ? 'low' : 'normal'
        };
      
      case 'radiacionPAR':
        const parVariation = (Math.random() - 0.5) * 400; // ±200
        const newPar = Math.round(currentValue + parVariation);
        const clampedPar = Math.max(100, Math.min(2000, newPar));
        return {
          value: clampedPar,
          status: clampedPar > 1500 ? 'high' : clampedPar < 500 ? 'low' : 'normal'
        };
      
      case 'onOff1':
      case 'onOff2':
        const shouldChange = Math.random() < 0.3; // 30% probabilidad de cambio
        const newState = shouldChange ? !currentValue : currentValue;
        return {
          value: newState,
          status: 'normal'
        };
      
      default:
        return { value: currentValue, status: 'normal' };
    }
  };

  // Actualizar sensores cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setIsUpdating(true);
      
      setTimeout(() => {
        setRealTimeSensors(prev => {
          const updated = {};
          Object.keys(prev).forEach(key => {
            const result = generateRandomValue(key, prev[key].value);
            updated[key] = {
              ...prev[key],
              value: result.value,
              status: result.status
            };
          });
          return updated;
        });
        
        setTimeout(() => setIsUpdating(false), 200);
      }, 100);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Función para generar nuevo punto de datos para curvas
  const generateNewDataPoint = useCallback(() => {
    const sensors = ['temp', 'humidity', 'light', 'pressure', 'co2', 'soil'];
    const colors = {
      temp: '#ff6b6b', humidity: '#4ecdc4', light: '#ffe66d', 
      pressure: '#a8e6cf', co2: '#ff8b94', soil: '#ffd93d'
    };
    
    const newPoints = sensors.map(sensorId => {
      const lastPoint = data.filter(d => d.sensorId === sensorId).slice(-1)[0];
      const baseValue = lastPoint ? lastPoint.value : 22;
      
             // Generar variación visible para actualizaciones cada 2 segundos
       const variation = (Math.random() - 0.5) * 3; // Variación más visible para updates cada 2s
       const newValue = Math.max(0, baseValue + variation);
      const now = new Date();
      
      return {
        id: `${sensorId}_${Date.now()}`,
        sensorId,
        sensorName: lastPoint?.sensorName || sensorId,
        value: Math.round(newValue * 100) / 100,
        date: now,
        hour: now.getHours(),
        day: Math.floor(Date.now() / (24 * 60 * 60 * 1000)),
        color: colors[sensorId],
        unit: lastPoint?.unit || '',
        x: Math.random() * 2 + 0.5,
        y: Math.random() * 1.5 + 0.5
      };
    });
    
    return newPoints;
  }, [data]);

  // Función para actualizar mapa de calor con variaciones sutiles
  const updateHeatmapData = useCallback(() => {
    return heatmapData.map(zoneData => ({
      ...zoneData,
      data: zoneData.data.map(cell => ({
        ...cell,
                 temperature: Math.max(15, Math.min(35, 
           cell.temperature + (Math.random() - 0.5) * 3 // Variación más visible de ±1.5°C
         )),
        count: Math.round(cell.temperature)
      }))
    }));
  }, [heatmapData]);

  // Actualización de curvas y tendencias cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const newPoints = generateNewDataPoint();
      setData(prevData => {
                 // Mantener solo los últimos 100 puntos por sensor para mejor visualización
         const maxPointsPerSensor = 100;
        const updatedData = [...prevData];
        
        newPoints.forEach(newPoint => {
          updatedData.push(newPoint);
          
          // Limitar puntos por sensor
          const sensorPoints = updatedData.filter(d => d.sensorId === newPoint.sensorId);
          if (sensorPoints.length > maxPointsPerSensor) {
            const oldestIndex = updatedData.findIndex(d => d.sensorId === newPoint.sensorId);
            updatedData.splice(oldestIndex, 1);
          }
        });
        
        return updatedData;
      });
      setLastUpdateTime(new Date());
         }, 2000); // 2 segundos

    return () => clearInterval(interval);
  }, [generateNewDataPoint]);

  // Actualización de mapa de calor cada 15 segundos (sin dependencia de updateHeatmapData)
  useEffect(() => {
    function updateHeatmap(prevHeatmap) {
      return prevHeatmap.map(zoneData => ({
        ...zoneData,
        data: zoneData.data.map(cell => ({
          ...cell,
          temperature: Math.max(15, Math.min(35, cell.temperature + (Math.random() - 0.5) * 3)),
          count: Math.round(cell.temperature)
        }))
      }));
    }
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setHeatmapData(prev => updateHeatmap(prev));
      }, 3000); // 3 segundos
      return () => clearInterval(interval);
    }, 2000); // Delay inicial de 2 segundos
    return () => clearTimeout(timeout);
  }, []);

  // Actualización de cambios críticos cada 1 segundo (con delay de 1000ms para asincronía)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        // Simular cambios críticos ocasionales
        if (Math.random() < 0.1) { // 10% probabilidad de cambio crítico (reducida para compensar mayor frecuencia)
          const newPoints = generateNewDataPoint().filter(p => p.sensorId === 'temp');
          if (newPoints.length > 0) {
            // Generar un cambio más dramático para temperatura
            newPoints[0].value += (Math.random() - 0.5) * 6; // Cambio más visible
            setData(prevData => [...prevData, ...newPoints]);
          }
        }
      }, 1000); // 1 segundo

      return () => clearInterval(interval);
    }, 1000); // Delay inicial de 1000ms

         return () => clearTimeout(timeout);
  }, [generateNewDataPoint]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSensors = Object.keys(realTimeSensors).length;
  const totalDataPoints = data.length;
  const timeRange = extent(data, d => d.date);

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes slideInRight {
            0% { transform: translateX(12px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
          
          @keyframes fadeInOut {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
          
          .chart-container {
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .data-point {
            animation: slideInRight 0.8s ease-out;
          }
          
          .heat-cell {
            transition: fill 1.5s ease-in-out, opacity 1s ease-in-out;
          }
          
          .chart-line {
            transition: all 0.8s ease-in-out;
          }
          
          .critical-point {
            animation: fadeInOut 2s infinite;
          }
        `}
      </style>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorBgBase: '#0a0a0a',
            colorBgContainer: '#1a1a1a',
            colorBgLayout: '#000000',
            colorBorder: '#333333',
            colorText: '#ffffff',
          },
        }}
      >
      <div style={{ 
        padding: '24px', 
        background: `
          repeating-radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 2px, transparent 32px),
          linear-gradient(135deg, #10141b 0%, #181e29 100%)
        `,
        backgroundSize: '34px 34px, 100% 100%',
        minHeight: '100vh'
      }}>
        {/* Header Ultra Fino Glass Morphism */}
        <div style={{ 
          marginBottom: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '4px 24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Row align="middle" justify="space-between" style={{width: '100%', flexWrap: 'nowrap'}}>
            {/* Izquierda: Ícono + Título */}
            <Col>
              <Space align="center" size={16}>
                <img 
                  src="/MODULARLOGO.png" 
                  alt="Modular Logo"
                  style={{ 
                    height: '108px', // 20% más grande que 90px
                    width: 'auto',
                    filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))',
                    maxHeight: '67px', // 20% más grande que 56px
                    objectFit: 'contain',
                  }} 
                />
                <Title level={4} style={{ 
                  margin: 0, 
                  color: 'rgba(200, 200, 200, 0.65)', 
                  fontSize: '16px', 
                  fontWeight: 'light',
                  letterSpacing: '0.5px',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                }}>Frontend Demo</Title>
              </Space>
            </Col>
            
            {/* Derecha: Sensores en tiempo real + Fecha y hora */}
            <Col>
              <Space size={24} align="center">
                {/* Sensores en tiempo real */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    backgroundColor: realTimeSensors.temperatura.status === 'high' ? '#ff4757' : 
                                    realTimeSensors.temperatura.status === 'low' ? '#2ed573' : '#00d4ff',
                    borderRadius: '50%',
                    boxShadow: `0 0 8px ${realTimeSensors.temperatura.status === 'high' ? '#ff4757' : 
                                        realTimeSensors.temperatura.status === 'low' ? '#2ed573' : '#00d4ff'}`,
                    transition: 'all 0.5s ease'
                  }}></div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', fontWeight: '400' }}>
                    Temp:
                  </Text>
                  <Text style={{ 
                    color: realTimeSensors.temperatura.status === 'high' ? '#ff4757' : 
                           realTimeSensors.temperatura.status === 'low' ? '#2ed573' : '#00d4ff',
                    fontSize: '12px', 
                    fontWeight: '600',
                    transition: 'color 0.5s ease'
                  }}>
                    {realTimeSensors.temperatura.value}°C
                  </Text>
                </div>
                
                {/* Humedad Aire */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    backgroundColor: realTimeSensors.humedadAire.status === 'high' ? '#ff4757' : 
                                    realTimeSensors.humedadAire.status === 'low' ? '#2ed573' : '#00d4ff',
                    borderRadius: '50%',
                    boxShadow: `0 0 8px ${realTimeSensors.humedadAire.status === 'high' ? '#ff4757' : 
                                        realTimeSensors.humedadAire.status === 'low' ? '#2ed573' : '#00d4ff'}`,
                    transition: 'all 0.5s ease'
                  }}></div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', fontWeight: '400' }}>
                    Hum.Aire:
                  </Text>
                  <Text style={{ 
                    color: realTimeSensors.humedadAire.status === 'high' ? '#ff4757' : 
                           realTimeSensors.humedadAire.status === 'low' ? '#2ed573' : '#00d4ff',
                    fontSize: '12px', 
                    fontWeight: '600',
                    transition: 'color 0.5s ease'
                  }}>
                    {realTimeSensors.humedadAire.value}%
                  </Text>
                </div>
                
                {/* Humedad Volumétrica */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    backgroundColor: realTimeSensors.humedadVolumetrica.status === 'high' ? '#ff4757' : 
                                    realTimeSensors.humedadVolumetrica.status === 'low' ? '#2ed573' : '#00d4ff',
                    borderRadius: '50%',
                    boxShadow: `0 0 8px ${realTimeSensors.humedadVolumetrica.status === 'high' ? '#ff4757' : 
                                        realTimeSensors.humedadVolumetrica.status === 'low' ? '#2ed573' : '#00d4ff'}`,
                    transition: 'all 0.5s ease'
                  }}></div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', fontWeight: '400' }}>
                    Hum.Vol:
                  </Text>
                  <Text style={{ 
                    color: realTimeSensors.humedadVolumetrica.status === 'high' ? '#ff4757' : 
                           realTimeSensors.humedadVolumetrica.status === 'low' ? '#2ed573' : '#00d4ff',
                    fontSize: '12px', 
                    fontWeight: '600',
                    transition: 'color 0.5s ease'
                  }}>
                    {realTimeSensors.humedadVolumetrica.value} VWC
                  </Text>
                </div>
                
                {/* PAR */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    backgroundColor: realTimeSensors.radiacionPAR.status === 'high' ? '#ff4757' : (realTimeSensors.radiacionPAR.status === 'low' ? '#2ed573' : '#00d4ff'),
                    borderRadius: '50%',
                    boxShadow: `0 0 8px ${realTimeSensors.radiacionPAR.status === 'high' ? '#ff4757' : (realTimeSensors.radiacionPAR.status === 'low' ? '#2ed573' : '#00d4ff')}`,
                    transition: 'all 0.5s ease'
                  }}></div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', fontWeight: '400' }}>
                    PAR:
                  </Text>
                  <Text style={{ 
                    color: realTimeSensors.radiacionPAR.status === 'high' ? '#ff4757' : (realTimeSensors.radiacionPAR.status === 'low' ? '#2ed573' : '#00d4ff'),
                    fontSize: '12px', 
                    fontWeight: '600',
                    transition: 'color 0.5s ease'
                  }}>
                    {realTimeSensors.radiacionPAR.value} µmol/m²/s
                  </Text>
                </div>
                
                {/* ON/OFF1 */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    backgroundColor: realTimeSensors.onOff1.value ? '#2ed573' : '#666',
                    borderRadius: '50%',
                    boxShadow: realTimeSensors.onOff1.value ? '0 0 8px #2ed573' : 'none',
                    transition: 'all 0.5s ease'
                  }}></div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', fontWeight: '400' }}>
                    ON/OFF1:
                  </Text>
                  <Text style={{ 
                    color: realTimeSensors.onOff1.value ? '#2ed573' : '#666',
                    fontSize: '12px', 
                    fontWeight: '600',
                    transition: 'color 0.5s ease'
                  }}>
                    {realTimeSensors.onOff1.value ? 'ON' : 'OFF'}
                  </Text>
                </div>
                
                {/* ON/OFF2 */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    backgroundColor: realTimeSensors.onOff2.value ? '#2ed573' : '#666',
                    borderRadius: '50%',
                    boxShadow: realTimeSensors.onOff2.value ? '0 0 8px #2ed573' : 'none',
                    transition: 'all 0.5s ease'
                  }}></div>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', fontWeight: '400' }}>
                    ON/OFF2:
                  </Text>
                  <Text style={{ 
                    color: realTimeSensors.onOff2.value ? '#2ed573' : '#666',
                    fontSize: '12px', 
                    fontWeight: '600',
                    transition: 'color 0.5s ease'
                  }}>
                    {realTimeSensors.onOff2.value ? 'ON' : 'OFF'}
                  </Text>
                </div>
                
                {/* Indicador de actualización */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '6px 10px',
                  background: isUpdating ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: `1px solid ${isUpdating ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '4px', 
                    height: '4px', 
                    backgroundColor: isUpdating ? '#00d4ff' : 'rgba(255, 255, 255, 0.4)',
                    borderRadius: '50%',
                    boxShadow: isUpdating ? '0 0 8px #00d4ff' : 'none',
                    transition: 'all 0.3s ease',
                    animation: isUpdating ? 'pulse 0.5s infinite' : 'none'
                  }}></div>
                  <Text style={{ 
                    color: isUpdating ? '#00d4ff' : 'rgba(255, 255, 255, 0.5)', 
                    fontSize: '10px', 
                    fontWeight: '500',
                    transition: 'color 0.3s ease'
                  }}>
                    {isUpdating ? 'Actualizando...' : 'Tiempo real'}
                  </Text>
                </div>
                {/* Fecha y hora actual */}
                <span style={{
                  color: '#aaa',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  marginLeft: '24px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                }}>
                  {currentTime.toLocaleString('es-CL', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Grid adaptativo con todos los dashboards */}
        <Row gutter={[16, 16]}>
          {sections
            .filter(section => visibleSections[section.key])
            .map((section, index, visibleSectionArray) => {
              const totalVisible = visibleSectionArray.length;
              const columnSpan = getSpecificColumnSpan(index, totalVisible);
              
              return (
                <Col key={section.key} xs={24} lg={columnSpan}>
                  <Card 
                    title={
                      <Space>
                        <section.icon style={{ color: section.color }} />
                        <span style={{ color: '#fff' }}>{section.title}</span>
                      </Space>
                    }
                    style={{ 
                      background: 'rgba(24, 31, 42, 0.10)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(16px)',
                      height: totalVisible <= 2 ? 'calc((100vh - 200px) / 2)' : 'calc((100vh - 200px) / 2)',
                      minHeight: '300px',
                      maxHeight: '450px'
                    }}
                    headStyle={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      padding: '8px 16px'
                    }}
                    bodyStyle={{ 
                      padding: '4px',
                      height: 'calc(100% - 50px)',
                      overflow: 'hidden'
                    }}
                  >
                    {['map', 'gallery'].includes(section.key) ? (
                      section.component()
                    ) : (
                      <ResponsiveChartContainer minHeight={250}>
                        {({ width, height }) => section.component(width, height)}
                      </ResponsiveChartContainer>
                    )}
                  </Card>
                </Col>
              );
            })}
        </Row>

        {/* Footer con información del sitio y controles de secciones */}
        <div style={{ 
          marginTop: '16px', 
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <Row justify="space-between" align="middle">
            <Col flex="1">
              <Space size={32} wrap={false}>
                {/* Última actualización */}
                <Space size={8} align="center">
                  <span style={{ color: '#888', fontSize: '14px' }}>🕒</span>
                  <Text style={{ color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    Última actualización: {lastUpdateTime.toLocaleString('es-ES')}
                  </Text>
                </Space>
                {/* Sitio */}
                <Space size={8} align="center">
                  <span style={{ color: '#888', fontSize: '14px' }}>🏭</span>
                  <Text style={{ color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    Sitio Yerbas Buenas
                  </Text>
                </Space>
                {/* Ubicación */}
                <Space size={8} align="center">
                  <span style={{ color: '#888', fontSize: '14px' }}>📍</span>
                  <Text style={{ color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    San Pedro de Atacama
                  </Text>
                </Space>
              </Space>
            </Col>
            
            {/* Centro: Controles de secciones */}
            <Col flex="0 0 auto" style={{ display: 'flex', justifyContent: 'center' }}>
              <Space size={4} align="center">
                {sections.map(section => {
                  const IconComponent = section.icon;
                  const isVisible = visibleSections[section.key];
                  return (
                    <div
                      key={section.key}
                      onClick={() => toggleSection(section.key)}
                      style={{
                        padding: '2px 3px',
                        borderRadius: '5px',
                        background: isVisible 
                          ? `${section.color}10` 
                          : 'rgba(255, 255, 255, 0.01)',
                        border: `1px solid ${isVisible ? section.color : 'rgba(255, 255, 255, 0.07)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '20px',
                        minHeight: '20px',
                        boxShadow: 'none'
                      }}
                      title={section.title}
                    >
                      <IconComponent 
                        style={{ 
                          fontSize: '13px', 
                          color: isVisible ? section.color : '#aaa',
                          transition: 'color 0.15s ease',
                          fontWeight: 400
                        }} 
                      />
                    </div>
                  );
                })}
              </Space>
            </Col>
            
            <Col flex="1" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space size={16} align="center">
                <Text style={{ 
                  color: '#888', 
                  fontSize: '12px', 
                  fontWeight: '500',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap'
                }}>
                  📌 Lat: -22.9083, Lon: -68.1992
                </Text>
                <Text style={{ 
                  color: '#666', 
                  fontSize: '12px', 
                  fontWeight: '500',
                  letterSpacing: '0.5px'
                }}>
                  Ancestral Technologies
                </Text>
              </Space>
            </Col>
          </Row>
        </div>
      </div>
    </ConfigProvider>
  </>);
}

export default VisxDemo; 
