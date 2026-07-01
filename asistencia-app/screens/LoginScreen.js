import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// 🔴 IMPORTANTE: Asegúrate de que la ruta de la imagen sea correcta
import logoImage from '../assets/images/logo-asistencia.png';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 🔴 CAMBIA ESTA IP POR LA TUYA REAL (la que sacaste con ipconfig en tu PC)
  const API_URL = 'http://192.168.0.34:3000/api/login';

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Campos vacíos', 'Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const datos = await respuesta.json();

      if (datos.exito) {
        // Si el login es exitoso, le pasamos los datos del maestro al componente padre
        onLoginSuccess(datos.maestro);
      } else {
        Alert.alert('Error de autenticación', datos.error || 'Usuario o contraseña incorrectos');
      }
    } catch (error) {
      console.error('Error en el login:', error);
      Alert.alert(
        'Error de conexión',
        'No se pudo conectar con el servidor. Asegúrate de que el servidor esté encendido y el celular esté en la misma red WiFi que la PC.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        
        {/* 🔴 EL LOGO DE BIENVENIDA */}
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Iniciar Sesión</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Usuario"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>ACCEDER</Text>
          )}
        </TouchableOpacity>
   
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Un gris azulado muy suave que contrasta bien con el logo
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 280,
    height: 280,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a2a47', // Azul oscuro corporativo del logo
    marginBottom: 30,
    letterSpacing: 1,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#c70d1d', // Rojo granate corporativo del logo
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#c70d1d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});