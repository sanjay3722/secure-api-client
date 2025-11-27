/**
 * React Integration Example
 * 
 * This example shows how to use secure-fetch-client in a React application:
 * - Using with useEffect
 * - Integrating with SWR
 * - Creating a custom hook
 * - Error handling in components
 */

import { useEffect, useState } from "react";
import { ApiClient } from "secure-fetch-client";

// Create a shared client instance
const apiClient = new ApiClient({
  baseUrl: "https://api.example.com",
});

// Example 1: Basic usage with useEffect
interface User {
  id: string;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        setLoading(true);
        const response = await apiClient.request<User>({
          url: `/users/${userId}`,
          method: "GET",
        });

        if (!cancelled) {
          if (response.ok) {
            setUser(response.data);
            setError(null);
          } else {
            setError(response.error.message);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to fetch user");
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return null;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Example 2: Custom hook for API calls
function useApi<T>(url: string, options?: { method?: string; body?: unknown }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const response = await apiClient.request<T>({
          url,
          method: (options?.method as any) || "GET",
          body: options?.body,
        });

        if (!cancelled) {
          if (response.ok) {
            setData(response.data);
            setError(null);
          } else {
            setError(response.error.message);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Request failed");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url, JSON.stringify(options)]);

  return { data, loading, error };
}

// Usage of custom hook
function UsersList() {
  const { data: users, loading, error } = useApi<{ users: User[] }>("/users");

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users?.users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// Example 3: Integration with SWR
import useSWR from "swr";

const swrFetcher = (url: string) =>
  apiClient
    .request({ url, method: "GET" })
    .then((res) => {
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    });

function UsersListWithSWR() {
  const { data, error, isLoading } = useSWR("/users", swrFetcher);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.users?.map((user: User) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// Example 4: Form submission
function CreateUserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await apiClient.request<{ id: string }>({
      url: "/users",
      method: "POST",
      body: { name, email },
    });

    if (response.ok) {
      console.log("User created:", response.data.id);
      setName("");
      setEmail("");
    } else {
      setError(response.error.message);
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      {error && <div style={{ color: "red" }}>{error}</div>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}

export { UserProfile, useApi, UsersList, UsersListWithSWR, CreateUserForm };

