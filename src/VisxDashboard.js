import React, { useState, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Button,
  Drawer,
  Form,
  InputNumber,
  Space,
  theme,
  ConfigProvider
} from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { Group } from '@visx/group';
import { AreaClosed, Line, Bar } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { GridRows, GridColumns } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { LinearGradient } from '@visx/gradient';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import 'antd/dist/reset.css';

const { Text } = Typography;

// Chart dimensions
const chartWidth = 280;
const chartHeight = 140;
const margin = { top: 10, right: 20, bottom: 30, left: 40 };
const innerWidth = chartWidth - margin.left - margin.right;
const innerHeight = chartHeight - margin.top - margin.bottom;

// Generate realistic sensor data for 1 month (30 days) with hourly measurements
const generateSensorData = () => {
  const sensors = [
    { id: 1, label: 'Temperatura', baseValue: 17, unit: '°C', variance: 8 },
    { id: 2, label: 'Humedad Aire', baseValue: 74, unit: '%', variance: 15 },
    { id: 3, label: 'Humedad Volumétrica', baseValue: 96, unit: 'VWC', variance: 20 },
    { id: 4, label: 'ON/OFF 2', baseValue: 0, unit: 'bool', variance: 0 },
    { id: 5, label: 'ON/OFF 1', baseValue: 0, unit: 'bool', variance: 0 },
    { id: 6, label: 'Radiación PAR', baseValue: 1043, unit: 'µmol m⁻² s⁻¹', variance: 400 }
  ];

  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  sensors.forEach(sensor => {
    for (let day = 0; day < 30; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        currentDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        let value;
        if (sensor.unit === 'bool') {
          value = Math.random() < 0.15 ? 1 : 0;
        } else if (sensor.label === 'Temperatura') {
          const timeOfDay = Math.sin((hour / 24) * 2 * Math.PI - Math.PI/2) + 1;
          const seasonalVariation = Math.sin((day / 30) * 2 * Math.PI) * 3;
          value = Math.round((sensor.baseValue + timeOfDay * 6 + seasonalVariation + (Math.random() - 0.5) * 4) * 10) / 10;
        } else if (sensor.label === 'Humedad Aire') {
          const timeOfDay = Math.sin((hour / 24) * 2 * Math.PI + Math.PI/2) + 1;
          value = Math.round(sensor.baseValue + timeOfDay * 8 + (Math.random() - 0.5) * 10);
          value = Math.max(30, Math.min(95, value));
        } else if (sensor.label === 'Radiación PAR') {
          if (hour >= 6 && hour <= 18) {
            const solarCurve = Math.sin(((hour - 6) / 12) * Math.PI);
            value = Math.round(sensor.baseValue * solarCurve + (Math.random() - 0.5) * 200);
          } else {
            value = Math.round(Math.random() * 50);
          }
          value = Math.max(0, value);
        } else {
          value = Math.round(sensor.baseValue + (Math.random() - 0.5) * sensor.variance);
        }

        const timestamp = currentDate.toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        data.push({
          id: `${sensor.id}_${day}_${hour}`,
          sensorId: sensor.id,
          label: sensor.label,
          value: value,
          unit: sensor.unit,
          ts: timestamp,
          date: new Date(currentDate)
        });
      }
    }
  });

  return data;
};

// Generate chart data with 10-minute intervals for last 24 hours
const generateChartData = (sensor) => {
  const points = [];
  const baseValue = sensor.value;
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  for (let i = 0; i < 144; i++) { // 144 points = 24 hours * 6 (every 10 minutes)
    const currentTime = new Date(startTime.getTime() + i * 10 * 60 * 1000);
    const timeInHours = i / 6;
    let currentValue = baseValue;
    let previousValue = i > 0 ? points[i-1].value : baseValue;
    
    if (sensor.unit === 'bool') {
      const switchProbability = (timeInHours >= 8 && timeInHours <= 18) ? 0.02 : 0.005;
      if (Math.random() < switchProbability) {
        currentValue = previousValue ? 0 : 1;
      } else {
        currentValue = previousValue;
      }
    } else {
      let variation = 0;
      
      if (sensor.label === 'Temperatura') {
        const timeOfDay = Math.sin((timeInHours / 24) * 2 * Math.PI - Math.PI/2) + 1;
        const baseTemp = baseValue + timeOfDay * 8;
        variation = (Math.random() - 0.5) * 3;
        currentValue = baseTemp + variation;
      } else if (sensor.label === 'Humedad Aire') {
        const timeOfDay = Math.sin((timeInHours / 24) * 2 * Math.PI + Math.PI/2) + 1;
        const baseHumidity = baseValue + timeOfDay * 10;
        variation = (Math.random() - 0.5) * 8;
        currentValue = Math.max(20, Math.min(95, baseHumidity + variation));
      } else if (sensor.label === 'Radiación PAR') {
        if (timeInHours >= 6 && timeInHours <= 18) {
          const solarCurve = Math.sin(((timeInHours - 6) / 12) * Math.PI);
          const cloudEffect = Math.random() < 0.3 ? Math.random() * 0.5 : 0.9;
          currentValue = baseValue * solarCurve * cloudEffect;
        } else {
          currentValue = Math.random() * 20;
        }
      } else {
        variation = (Math.random() - 0.5) * (baseValue * 0.1);
        currentValue = Math.max(0, baseValue + variation);
      }
    }
    
    const fluctuation = Math.abs(currentValue - previousValue);
    
    points.push({
      time: currentTime,
      value: Math.round(currentValue * 100) / 100,
      fluctuation: Math.round(fluctuation * 100) / 100,
      minute: i * 10
    });
  }
  
  return points;
};

// Custom chart component using Visx
const SensorChart = ({ sensor, data, width = chartWidth, height = chartHeight }) => {
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip();

  // Scales
  const timeScale = useMemo(
    () =>
      scaleTime({
        range: [0, innerWidth],
        domain: [data[0]?.time, data[data.length - 1]?.time],
      }),
    [data]
  );

  const valueScale = useMemo(() => {
    const values = data.map(d => d.value);
    const domain = sensor.unit === 'bool' 
      ? [0, 1] 
      : [Math.min(...values) * 0.95, Math.max(...values) * 1.05];
    
    return scaleLinear({
      range: [innerHeight, 0],
      domain,
      nice: true,
    });
  }, [data, sensor.unit]);

  // Accessors
  const getTime = (d) => d.time;
  const getValue = (d) => d.value;

  // Colors based on sensor type
  const getColor = () => {
    if (sensor.unit === 'bool') {
      return sensor.value ? '#52c41a' : '#ff4d4f';
    }
    return '#1890ff';
  };

  const handleTooltip = (event) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = timeScale.invert(x - margin.left);
    const index = data.findIndex(d => d.time >= x0);
    const d = data[Math.max(0, index - 1)];
    
    showTooltip({
      tooltipData: d,
      tooltipLeft: x,
      tooltipTop: valueScale(getValue(d)) + margin.top,
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <LinearGradient
          id={`area-gradient-${sensor.id}`}
          from={getColor()}
          to={getColor()}
          fromOpacity={0.3}
          toOpacity={0.1}
        />
        
        <Group left={margin.left} top={margin.top}>
          {/* Grid lines */}
          <GridRows
            scale={valueScale}
            width={innerWidth}
            height={innerHeight}
            stroke="#434343"
            strokeDasharray="3,3"
            numTicks={5}
          />
          <GridColumns
            scale={timeScale}
            width={innerWidth}
            height={innerHeight}
            stroke="#434343"
            strokeDasharray="3,3"
            numTicks={5}
          />
          
          {/* Area chart for numeric sensors */}
          {sensor.unit !== 'bool' && (
            <AreaClosed
              data={data}
              x={(d) => timeScale(getTime(d))}
              y={(d) => valueScale(getValue(d))}
              yScale={valueScale}
              strokeWidth={2}
              stroke={getColor()}
              fill={`url(#area-gradient-${sensor.id})`}
              curve={curveMonotoneX}
            />
          )}
          
          {/* Bar chart for boolean sensors */}
          {sensor.unit === 'bool' && data.map((d, i) => {
            const barHeight = d.value ? innerHeight / 2 : 2;
            const barY = d.value ? innerHeight / 4 : innerHeight - 2;
            const barWidth = innerWidth / data.length;
            
            return (
              <Bar
                key={i}
                x={timeScale(getTime(d)) - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={d.value ? '#52c41a' : '#ff4d4f'}
                fillOpacity={0.7}
              />
            );
          })}
          
          {/* Line overlay */}
          <Line
            data={data}
            x={(d) => timeScale(getTime(d))}
            y={(d) => valueScale(getValue(d))}
            stroke={getColor()}
            strokeWidth={2}
            curve={sensor.unit === 'bool' ? undefined : curveMonotoneX}
          />
          
          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={timeScale}
            numTicks={5}
            stroke="#8c8c8c"
            tickStroke="#8c8c8c"
            tickLabelProps={{
              fill: '#8c8c8c',
              fontSize: 10,
              textAnchor: 'middle',
            }}
            tickFormat={(value) => {
              const hours = value.getHours();
              return `${hours.toString().padStart(2, '0')}:00`;
            }}
          />
          
          <AxisLeft
            scale={valueScale}
            numTicks={5}
            stroke="#8c8c8c"
            tickStroke="#8c8c8c"
            tickLabelProps={{
              fill: '#8c8c8c',
              fontSize: 10,
              textAnchor: 'end',
              dx: -4,
            }}
            tickFormat={(value) => {
              if (sensor.unit === 'bool') {
                return value === 1 ? 'ON' : value === 0 ? 'OFF' : '';
              }
              return value.toFixed(1);
            }}
          />
          
          {/* Invisible overlay for tooltip */}
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={handleTooltip}
            onMouseLeave={hideTooltip}
          />
        </Group>
      </svg>
      
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...defaultStyles,
            background: '#1f1f1f',
            border: '1px solid #434343',
            color: '#ffffff',
          }}
        >
          <div>
            <strong>{sensor.label}</strong>
          </div>
          <div>
            Valor: {tooltipData.value} {sensor.unit !== 'bool' ? sensor.unit : (tooltipData.value ? 'ON' : 'OFF')}
          </div>
          <div>
            Hora: {tooltipData.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {sensor.unit !== 'bool' && (
            <div>
              Fluctuación: ±{tooltipData.fluctuation} {sensor.unit}
            </div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
};

const VisxDashboard = () => {
  const { token } = theme.useToken();
  const allSensorData = generateSensorData();
  
  // Get the latest reading for each sensor type
  const getLatestSensorReadings = () => {
    const sensorTypes = [1, 2, 3, 4, 5, 6];
    return sensorTypes.map(sensorId => {
      const sensorReadings = allSensorData.filter(reading => reading.sensorId === sensorId);
      return sensorReadings.reduce((latest, current) => 
        current.date > latest.date ? current : latest
      );
    });
  };

  const [data, setData] = useState(getLatestSensorReadings());
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const handleFormSubmit = (values) => {
    const updatedData = data.map(sensor => ({
      ...sensor,
      value: values[`sensor_${sensor.id}`] || sensor.value
    }));
    setData(updatedData);
    setDrawerVisible(false);
  };

  const openDrawer = () => {
    const initialValues = {};
    data.forEach(sensor => {
      initialValues[`sensor_${sensor.id}`] = sensor.value;
    });
    form.setFieldsValue(initialValues);
    setDrawerVisible(true);
  };

  const formatValue = (value, unit) => {
    if (unit === 'bool') {
      return value ? 'ON' : 'OFF';
    }
    return typeof value === 'number' ? value.toLocaleString() : value;
  };

  const getStatisticValueStyle = (sensor) => {
    if (sensor.unit === 'bool') {
      return {
        color: sensor.value ? '#52c41a' : '#ff4d4f'
      };
    }
    return {};
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgBase: '#141414',
          colorBgContainer: '#1f1f1f',
          colorBgLayout: '#000000',
          colorBorder: '#434343',
          colorText: '#ffffff',
        },
      }}
    >
      <div style={{ 
        padding: '24px', 
        background: '#000000',
        minHeight: '100vh'
      }}>
        <div style={{ 
          marginBottom: '24px', 
          textAlign: 'center',
          background: '#1f1f1f',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #434343'
        }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            margin: 0,
            color: '#ffffff'
          }}>
            Dashboard IoT con Visx
          </h1>
          <Text style={{ fontSize: '16px', color: '#8c8c8c' }}>
            Visualización avanzada con D3 + React | Última actualización: {new Date().toLocaleString('es-ES')}
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          {data.map((sensor) => {
            const chartData = generateChartData(sensor);
            const avgFluctuation = sensor.unit !== 'bool' 
              ? chartData.reduce((sum, point) => sum + point.fluctuation, 0) / chartData.length
              : 0;
            
            return (
              <Col xs={24} sm={12} md={8} key={sensor.id}>
                <Card 
                  hoverable
                  style={{ 
                    minHeight: '380px',
                    background: '#1f1f1f',
                    border: '1px solid #434343',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  <Statistic
                    title={sensor.label}
                    value={formatValue(sensor.value, sensor.unit)}
                    suffix={sensor.unit !== 'bool' ? sensor.unit : ''}
                    valueStyle={getStatisticValueStyle(sensor)}
                  />
                  <Text style={{ display: 'block', marginTop: '8px', color: '#8c8c8c' }}>
                    {sensor.ts}
                  </Text>
                  
                  <div style={{ marginTop: '16px' }}>
                    <SensorChart sensor={sensor} data={chartData} />
                  </div>
                  
                  {/* Statistics */}
                  {sensor.unit !== 'bool' && (
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        Fluctuación promedio: ±{Math.round(avgFluctuation * 100) / 100} {sensor.unit}
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        Últimas 24h (10min)
                      </Text>
                    </div>
                  )}
                  
                  {sensor.unit === 'bool' && (
                    <div style={{ marginTop: '12px' }}>
                      <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        Activaciones en las últimas 24h: {
                          (() => {
                            let activations = 0;
                            for (let i = 1; i < chartData.length; i++) {
                              if (chartData[i].value === 1 && chartData[i-1].value === 0) {
                                activations++;
                              }
                            }
                            return activations;
                          })()
                        } veces
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* Floating Settings Button */}
        <Button
          type="primary"
          shape="circle"
          icon={<SettingOutlined />}
          size="large"
          onClick={openDrawer}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            boxShadow: '0 4px 16px rgba(24, 144, 255, 0.3)',
            background: '#1890ff',
            borderColor: '#1890ff'
          }}
        />

        {/* Settings Drawer */}
        <Drawer
          title="Editar datos"
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={400}
          styles={{
            header: {
              background: '#1f1f1f',
              borderBottom: '1px solid #434343',
              color: '#ffffff'
            },
            body: {
              background: '#141414',
              color: '#ffffff'
            }
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {data.map((sensor) => (
                <Form.Item
                  key={sensor.id}
                  label={`${sensor.label} (${sensor.unit})`}
                  name={`sensor_${sensor.id}`}
                  rules={[
                    {
                      required: true,
                      message: `Por favor ingresa un valor para ${sensor.label}`,
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder={`Valor actual: ${sensor.value}`}
                    step={sensor.unit === '°C' ? 0.1 : 1}
                    min={sensor.unit === 'bool' ? 0 : undefined}
                    max={sensor.unit === 'bool' ? 1 : undefined}
                    addonAfter={sensor.unit}
                  />
                </Form.Item>
              ))}
            </Space>
            
            <div style={{ marginTop: '24px' }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  Guardar Cambios
                </Button>
                <Button onClick={() => setDrawerVisible(false)}>
                  Cancelar
                </Button>
              </Space>
            </div>
          </Form>
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default VisxDashboard; 