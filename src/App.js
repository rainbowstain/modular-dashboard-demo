import React, { useState } from 'react';
import { Button, Space, Typography, Card, ConfigProvider, theme } from 'antd';
import { ThunderboltOutlined, RocketOutlined } from '@ant-design/icons';
import VisxDashboard from './VisxDashboard';
import VisxDemo from './VisxDemo';

const { Title, Text } = Typography;

function App() {
  const [currentView, setCurrentView] = useState('demo'); // Por defecto mostrar la demo

  return (
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        padding: currentView === 'home' ? '40px' : '0'
      }}>
        {currentView === 'home' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Card style={{ 
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid #333',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              marginBottom: '40px'
            }}>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <ThunderboltOutlined style={{ fontSize: '72px', color: '#ff6b6b', marginBottom: '20px' }} />
                <Title level={1} style={{ color: '#fff', marginBottom: '10px' }}>
                  Modular Cloud Demo
                </Title>
                <Text style={{ color: '#ccc', fontSize: '18px', display: 'block', marginBottom: '30px' }}>
                  Plataforma avanzada de visualización de datos IoT para presentación ejecutiva
                </Text>
                
                <Space size="large" direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<RocketOutlined />}
                    onClick={() => setCurrentView('demo')}
                    style={{ 
                      height: '60px', 
                      fontSize: '18px', 
                      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                      border: 'none',
                      boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)'
                    }}
                  >
                    🚀 Ver Demo Completa de VISX
                  </Button>
                  
                  <Button 
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={() => setCurrentView('dashboard')}
                    style={{ 
                      height: '50px', 
                      fontSize: '16px',
                      background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                      border: 'none',
                      color: '#fff'
                    }}
                  >
                    📊 Dashboard VISX
                  </Button>
                </Space>

                <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                  <Title level={4} style={{ color: '#fff', marginBottom: '16px' }}>
                    🎯 Lo que verás en la demo:
                  </Title>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', textAlign: 'left' }}>
                    <div>
                      <Text strong style={{ color: '#ff6b6b' }}>🔥 Detección de Cambios Críticos</Text>
                      <br />
                      <Text style={{ color: '#ccc', fontSize: '14px' }}>Split Line Paths para cambios de temperatura</Text>
                    </div>
                    <div>
                      <Text strong style={{ color: '#4ecdc4' }}>🗺️ Mapas de Calor Interactivos</Text>
                      <br />
                      <Text style={{ color: '#ccc', fontSize: '14px' }}>Visualización por zonas y horarios</Text>
                    </div>
                    <div>
                      <Text strong style={{ color: '#ffe66d' }}>📊 Curvas Avanzadas</Text>
                      <br />
                      <Text style={{ color: '#ccc', fontSize: '14px' }}>Múltiples tipos de interpolación</Text>
                    </div>
                    <div>
                      <Text strong style={{ color: '#a8e6cf' }}>🎯 Dispersión con Voronoi</Text>
                      <br />
                      <Text style={{ color: '#ccc', fontSize: '14px' }}>Análisis espacial de sensores</Text>
                    </div>
                    <div>
                      <Text strong style={{ color: '#ff8b94' }}>🎨 Leyendas Dinámicas</Text>
                      <br />
                      <Text style={{ color: '#ccc', fontSize: '14px' }}>Sistema de leyendas interactivas</Text>
                    </div>
                    <div>
                      <Text strong style={{ color: '#ffd93d' }}>⚡ Patrones Visuales</Text>
                      <br />
                      <Text style={{ color: '#ccc', fontSize: '14px' }}>Efectos y patrones avanzados</Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {currentView === 'demo' && (
          <div>
            <div style={{ 
              position: 'fixed', 
              top: '20px', 
              left: '20px', 
              zIndex: 1000,
              background: 'rgba(0,0,0,0.8)',
              padding: '10px',
              borderRadius: '8px'
            }}>
              <Button 
                type="primary" 
                size="small"
                onClick={() => setCurrentView('home')}
                icon={<ThunderboltOutlined />}
              >
                ← Volver al Menú
              </Button>
            </div>
            <VisxDemo />
          </div>
        )}

        {currentView === 'dashboard' && (
          <div>
            <div style={{ 
              position: 'fixed', 
              top: '20px', 
              left: '20px', 
              zIndex: 1000,
              background: 'rgba(0,0,0,0.8)',
              padding: '10px',
              borderRadius: '8px'
            }}>
              <Button 
                type="primary" 
                size="small"
                onClick={() => setCurrentView('home')}
                icon={<ThunderboltOutlined />}
              >
                ← Volver al Menú
              </Button>
            </div>
            <VisxDashboard />
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}

export default App; 