import { useState } from 'react';
import Cookies from 'universal-cookie';
import Axios from 'axios';

function Login({ setIsAuth }) {
  const cookies = new Cookies();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = () => {
    Axios.post(process.env.REACT_APP_API_URL + '/login', {
      username,
      password,
    }).then((res) => {
      const { token, userId, firstName, lastName, username } = res.data;

      cookies.set('token', token);
      cookies.set('userId', userId);
      cookies.set('username', username);
      cookies.set('firstName', firstName);
      cookies.set('lastName', lastName);
      setIsAuth(true);
    });
  };
  return (
    <div className="login">
      <label>Login</label>
      <input
        placeholder="Username"
        onChange={(event) => {
          setUsername(event.target.value);
        }}
      />
      <input
        placeholder="Password"
        type="password"
        onChange={(event) => {
          setPassword(event.target.value);
        }}
      />

      <button onClick={login}>Login</button>
    </div>
  );
}
export default Login;
