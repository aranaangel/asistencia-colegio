import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { loginMaestro, verificarConexion } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validar campos
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      // Verificar conexión al servidor
      const hayConexion = await verificarConexion();
      if (!hayConexion) {
        Alert.alert(
          'Error de conexión',
          'No se puede conectar al servidor. Verifica que:\n1. El servidor esté corriendo\n2. La IP en api.js sea correcta'
        );
        setLoading(false);
        return;
      }

      // Intentar login con el servidor
      const maestro = await loginMaestro(username, password);

      // Si llegamos aquí, el login fue exitoso
      Alert.alert('✅ Éxito', `Bienvenido ${maestro.nombres || maestro.username}`);
      onLoginSuccess(maestro);

    } catch (error) {
      Alert.alert('❌ Error', error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sistema de Asistencia</Text>
      <Text style={styles.subtitle}>Ingresa con tu usuario</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={username}
        onChangeText={setUsername}
        placeholderTextColor="#999"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
        placeholderTextColor="#999"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Usa las credenciales del maestro de Supabase
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: 30,
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});