import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export async function practiceWebAuthn(action, api, navigatorObject = navigator, client = { register: startRegistration, authenticate: startAuthentication }) {
  if (!navigatorObject.credentials) throw new Error('Este navegador no dispone de claves de acceso. Usa un navegador compatible en localhost.');
  const register = action === 'register';
  const prefix = register ? '/api/auth/register' : '/api/auth/login';
  const options = await api.post(prefix + '/options', {});
  const response = register ? await client.register({ optionsJSON: options }) : await client.authenticate({ optionsJSON: options });
  const result = await api.post(prefix + '/verify', response);
  if (!result.verified) throw new Error('El servicio no pudo verificar la clave de acceso.');
  return register ? 'Clave de acceso registrada. Puedes probar la autenticación.' : 'Autenticación verificada por el servicio local.';
}
