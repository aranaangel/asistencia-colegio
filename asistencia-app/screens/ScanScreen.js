import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ScanScreen({ user, onLogout }) {
  // ============ ESTADOS ============
  const [movementType, setMovementType] = useState(null); // 'entrada' o 'salida'
  const [isScannerActive, setIsScannerActive] = useState(false); // Si el escáner está activo
  const [lastScanned, setLastScanned] = useState(null); // Último estudiante registrado
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // ============ PERMISOS DE CÁMARA ============
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Necesitamos acceso a la cámara</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Permitir acceso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============ FUNCIONES ============
  
  // Iniciar escaneo
  const handleStartScanning = (type) => {
    setMovementType(type);
    setIsScannerActive(true);
  };

  // Detener escaneo y volver al inicio
  const handleStopScanning = () => {
    setIsScannerActive(false);
    setMovementType(null);
  };

  // Manejar escaneo de código QR
  const handleBarcodeScanned = async ({ data }) => {
    if (!isScannerActive) return; 

    // 1. Apagar el escáner INMEDIATAMENTE al leer el QR
    setIsScannerActive(false); 

    try {
      const scannedInfo = JSON.parse(data);
      
      if (!scannedInfo.codigo) {
        Alert.alert('❌ Error', 'Código QR inválido');
        return;
      }

      // 🟢 CAMBIA ESTA IP POR LA TUYA REAL (la que sacaste con ipconfig)
      const API_URL = 'http://192.168.0.105:3000/api/registrar-asistencia'; 

      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_codigo: scannedInfo.codigo,
          tipo_movimiento: movementType,
          maestro_id: user.id 
        }),
      });

      const datos = await respuesta.json();

      if (datos.exito) {
        setLastScanned({
          nombre: datos.datos.estudiante_nombre_completo,
          codigo: datos.datos.estudiante_codigo,
          grado: datos.datos.estudiante_grado || 'N/A',
          tipo: datos.datos.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA',
          hora: datos.datos.hora,
        });

        Alert.alert('🎉 Registro Exitoso', 
          `${datos.datos.tipo === 'entrada' ? '🟩 ENTRADA' : '🟧 SALIDA'}\n\n` +
          `Estudiante: ${datos.datos.estudiante_nombre_completo}\n` +
          `Código: ${datos.datos.estudiante_codigo}\n` +
          `Grado: ${datos.datos.estudiante_grado || 'N/A'}\n` +
          `Hora: ${datos.datos.hora}\n\n` +
          `Registrado por: ${user.nombres || user.username}`
        );
      } else {
        Alert.alert('❌ Error del servidor', datos.error || 'No se pudo registrar la asistencia');
      }

    } catch (error) {
      console.error('Error en el escaneo:', error);
      Alert.alert('❌ Error de conexión', 'No se pudo conectar al servidor.');
    }
  };

  // ============ RENDER ============
  return (
    <SafeAreaView style={styles.container}>
      
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📸 Sistema de Asistencia</Text>
        <Text style={styles.userText}>
          👤 {user.nombres} {user.apellidos} ({user.username})
        </Text>
      </View>

      {/* ===== CÁMARA ===== */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        {/* Overlay de escaneo (solo cuando está activo) */}
        {isScannerActive && (
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scannerText}>
              {movementType === 'entrada' ? '🟢 Escaneando ENTRADA' : '🟠 Escaneando SALIDA'}
            </Text>
            <Text style={styles.scannerSubtext}>Apunta al código QR</Text>
          </View>
        )}

        {/* Indicador de escáner inactivo (Sin fondo oscuro) */}
        {!isScannerActive && (
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        )}
      </View>

      {/* ===== BOTONES DE ENTRADA/SALIDA ===== */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.entradaButton]}
          onPress={() => handleStartScanning('entrada')}
          disabled={isScannerActive}
        >
          <Text style={styles.actionButtonText}>↓ ENTRADA</Text>
          <Text style={styles.actionButtonSubtext}>Escanear llegada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.salidaButton]}
          onPress={() => handleStartScanning('salida')}
          disabled={isScannerActive}
        >
          <Text style={styles.actionButtonText}>↑ SALIDA</Text>
          <Text style={styles.actionButtonSubtext}>Escanear salida</Text>
        </TouchableOpacity>
      </View>

      {/* ===== ÚLTIMO REGISTRADO ===== */}
      <View style={styles.lastScanContainer}>
        <Text style={styles.lastScanTitle}>📋 Último registrado:</Text>
        {lastScanned ? (
          <View>
            <Text style={styles.lastScanName}>{lastScanned.nombre}</Text>
            <View style={styles.lastScanDetails}>
              <Text style={styles.lastScanCode}>Código: {lastScanned.codigo}</Text>
              <Text style={[
                styles.lastScanType,
                lastScanned.tipo === 'ENTRADA' ? styles.entradaText : styles.salidaText
              ]}>
                {lastScanned.tipo}
              </Text>
            </View>
            <Text style={styles.lastScanTime}>🕐 {lastScanned.hora}</Text>
          </View>
        ) : (
          <Text style={styles.noDataText}>Sin registros aún</Text>
        )}
      </View>

      {/* ===== BOTÓN CERRAR SESIÓN ===== */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          Alert.alert('¿Cerrar sesión?', 'Se cerrará tu sesión actual', [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Cerrar sesión',
              onPress: onLogout,
              style: 'destructive',
            },
          ]);
        }}
      >
        <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ============ ESTILOS ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  userText: { fontSize: 14, color: '#666' },
  cameraContainer: { flex: 1, margin: 15, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', position: 'relative' },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // 🔥 ELIMINAMOS EL FONDO OSCURO. ¡La cámara se verá completamente nítida!
  },
  scannerFrame: { width: 250, height: 250, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#00FF00', borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scannerText: { marginTop: 20, color: '#fff', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  scannerSubtext: { marginTop: 8, color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 5 },
  buttonsContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, gap: 10 },
  actionButton: { flex: 1, paddingVertical: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  entradaButton: { backgroundColor: '#34C759' },
  salidaButton: { backgroundColor: '#FF9500' },
  actionButtonText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  actionButtonSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  lastScanContainer: { marginHorizontal: 15, marginTop: 5, marginBottom: 10, padding: 15, backgroundColor: '#fff', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  lastScanTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 6 },
  lastScanName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  lastScanDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  lastScanCode: { fontSize: 14, color: '#666' },
  lastScanType: { fontSize: 14, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 4 },
  entradaText: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  salidaText: { backgroundColor: '#FFF3E0', color: '#E65100' },
  lastScanTime: { fontSize: 12, color: '#999', marginTop: 4 },
  noDataText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  logoutButton: { marginHorizontal: 15, marginBottom: 15, padding: 12, backgroundColor: '#FF3B30', borderRadius: 8, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  permissionButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#007AFF', borderRadius: 8 },
  permissionButtonText: { color: '#fff', fontWeight: 'bold' },
  message: { fontSize: 16, color: '#333' },
});