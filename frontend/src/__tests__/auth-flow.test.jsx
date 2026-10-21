import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import App from '../App.jsx';
import { ApiError } from '../api.js';

const apiFetchMock = vi.fn();
const authLoginMock = vi.fn();
const authRegisterMock = vi.fn();
const saveTokenMock = vi.fn();
const clearTokenMock = vi.fn();

vi.mock('../api.js', async () => {
  const actual = await vi.importActual('../api.js');
  return {
    ...actual,
    apiFetch: (...args) => apiFetchMock(...args),
    authAPI: {
      login: (...args) => authLoginMock(...args),
      register: (...args) => authRegisterMock(...args),
    },
    saveToken: (...args) => saveTokenMock(...args),
    clearToken: (...args) => clearTokenMock(...args),
  };
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  apiFetchMock.mockReset();
  authLoginMock.mockReset();
  authRegisterMock.mockReset();
  saveTokenMock.mockReset();
  clearTokenMock.mockReset();

  apiFetchMock.mockImplementation(async (path) => {
    if (path === '/users/me') {
      return { data: { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'student' } };
    }
    return { data: [] };
  });

  localStorage.clear();
});

describe('login screen', () => {
  it('renders the sign in form', () => {
    renderAt('/login');

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('does not call the API when the form is empty', async () => {
    const user = userEvent.setup();
    renderAt('/login');

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    // The browser blocks the submit because the required fields are empty.
    expect(authLoginMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('sends the credentials to the login endpoint', async () => {
    const user = userEvent.setup();
    authLoginMock.mockResolvedValue({
      data: { token: 'jwt-token', user: { id: 1, name: 'Ada', email: 'ada@example.com' } },
    });
    renderAt('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(authLoginMock).toHaveBeenCalledTimes(1));
    expect(authLoginMock).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'correct-horse',
    });
  });

  it('stores the token and opens the dashboard after a successful login', async () => {
    const user = userEvent.setup();
    authLoginMock.mockResolvedValue({
      data: { token: 'jwt-token', user: { id: 1, name: 'Ada', email: 'ada@example.com' } },
    });
    renderAt('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(saveTokenMock).toHaveBeenCalledWith('jwt-token'));
    expect(await screen.findByText('Smarty AI tutor')).toBeInTheDocument();
  });

  it('shows the server message for invalid credentials and stays on the form', async () => {
    const user = userEvent.setup();
    authLoginMock.mockRejectedValue(
      new ApiError('Invalid email or password', { kind: 'unauthorized', status: 401 }),
    );
    renderAt('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(saveTokenMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('restores the submit button after a network failure', async () => {
    const user = userEvent.setup();
    authLoginMock.mockRejectedValue(
      new ApiError('Could not reach the server.', { kind: 'network' }),
    );
    renderAt('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled());
    expect(screen.getByText(/could not reach the server/i)).toBeInTheDocument();
  });

  it('offers a retry only for failures where retrying makes sense', async () => {
    const user = userEvent.setup();
    authLoginMock.mockRejectedValue(
      new ApiError('Could not reach the server.', { kind: 'network' }),
    );
    renderAt('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument());
  });
});

describe('registration screen', () => {
  it('sends the expected payload', async () => {
    const user = userEvent.setup();
    authRegisterMock.mockResolvedValue({
      data: { token: 'jwt-token', user: { id: 2, name: 'Grace', email: 'grace@example.com' } },
    });
    renderAt('/register');

    await user.type(screen.getByLabelText('Full name'), 'Grace Hopper');
    await user.type(screen.getByLabelText('Email'), 'grace@example.com');
    await user.type(screen.getByLabelText('Password'), 'compiler123');
    await user.type(screen.getByLabelText('Confirm password'), 'compiler123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(authRegisterMock).toHaveBeenCalledTimes(1));
    expect(authRegisterMock).toHaveBeenCalledWith({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'compiler123',
    });
  });

  it('rejects mismatched passwords without calling the API', async () => {
    const user = userEvent.setup();
    renderAt('/register');

    await user.type(screen.getByLabelText('Full name'), 'Grace Hopper');
    await user.type(screen.getByLabelText('Email'), 'grace@example.com');
    await user.type(screen.getByLabelText('Password'), 'compiler123');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(authRegisterMock).not.toHaveBeenCalled();
  });

  it('shows a duplicate account error', async () => {
    const user = userEvent.setup();
    authRegisterMock.mockRejectedValue(
      new ApiError('Email already registered', { kind: 'conflict', status: 409 }),
    );
    renderAt('/register');

    await user.type(screen.getByLabelText('Full name'), 'Grace Hopper');
    await user.type(screen.getByLabelText('Email'), 'grace@example.com');
    await user.type(screen.getByLabelText('Password'), 'compiler123');
    await user.type(screen.getByLabelText('Confirm password'), 'compiler123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Email already registered')).toBeInTheDocument();
    expect(saveTokenMock).not.toHaveBeenCalled();
  });

  it('prevents a duplicate submission while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolveRequest;
    authRegisterMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderAt('/register');

    await user.type(screen.getByLabelText('Full name'), 'Grace Hopper');
    await user.type(screen.getByLabelText('Email'), 'grace@example.com');
    await user.type(screen.getByLabelText('Password'), 'compiler123');
    await user.type(screen.getByLabelText('Confirm password'), 'compiler123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    const button = await screen.findByRole('button', { name: 'Creating account...' });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(authRegisterMock).toHaveBeenCalledTimes(1);

    resolveRequest({ data: { token: 'jwt-token', user: { id: 3, name: 'Grace' } } });
    await waitFor(() => expect(saveTokenMock).toHaveBeenCalledWith('jwt-token'));
  });
});

describe('session handling', () => {
  it('restores a stored session on load', async () => {
    localStorage.setItem('accessToken', 'stored-token');

    renderAt('/');

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith('/users/me'));
    expect(await screen.findByText('Smarty AI tutor')).toBeInTheDocument();
  });

  it('does not call the API when there is no stored session', async () => {
    renderAt('/');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Learn with confidence.' })).toBeInTheDocument(),
    );
    expect(apiFetchMock).not.toHaveBeenCalledWith('/users/me');
  });
});
