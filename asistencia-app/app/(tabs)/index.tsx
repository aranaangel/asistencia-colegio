import { useState } from 'react';
import { StyleSheet } from 'react-native';
import LoginScreen from '../../screens/LoginScreen';
import ScanScreen from '../../screens/ScanScreen';

export default function App() {
// Estado para manejar si el usuario está autenticado
const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
const [currentUser, setCurrentUser] = useState<string | null>(null); // ✅ Puede ser string o null

// Manejar login exitoso
const handleLoginSuccess = (username: string) => { // ✅ Tipamos que username es string
  setCurrentUser(username); // ✅ Ahora coincide: string es válido
  setIsLoggedIn(true);
  console.log(`✅ Login exitoso: ${username}`);
};

// Manejar logout
const handleLogout = () => {
  setIsLoggedIn(false);
  setCurrentUser(null); // ✅ Ahora coincide: null es válido
  console.log('Sesión cerrada');
};

  return (
    <>
      {isLoggedIn ? (
        // Pantalla de escaneo si está autenticado
        <ScanScreen user={currentUser} onLogout={handleLogout} />
      ) : (
        // Pantalla de login si NO está autenticado
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});