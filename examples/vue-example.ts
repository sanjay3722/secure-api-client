/**
 * Vue Integration Example
 * 
 * This example shows how to use secure-fetch-client in a Vue application:
 * - Using with Composition API
 * - Creating composables
 * - Reactive state management
 * - Error handling
 */

import { ref, onMounted, computed } from "vue";
import { ApiClient } from "secure-fetch-client";

// Create a shared client instance
const apiClient = new ApiClient({
  baseUrl: "https://api.example.com",
});

interface User {
  id: string;
  name: string;
  email: string;
}

// Example 1: Basic composable for fetching data
export function useUsers() {
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchUsers = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.request<{ users: User[] }>({
        url: "/users",
        method: "GET",
      });

      if (response.ok) {
        users.value = response.data.users;
      } else {
        error.value = response.error.message;
      }
    } catch {
      error.value = "Failed to fetch users";
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchUsers();
  });

  return {
    users,
    loading,
    error,
    fetchUsers,
  };
}

// Example 2: Composable for a single user
export function useUser(userId: string) {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchUser = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.request<User>({
        url: `/users/${userId}`,
        method: "GET",
      });

      if (response.ok) {
        user.value = response.data;
      } else {
        error.value = response.error.message;
      }
    } catch {
      error.value = "Failed to fetch user";
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchUser();
  });

  return {
    user,
    loading,
    error,
    fetchUser,
  };
}

// Example 3: Generic API composable
export function useApi<T>(url: string, options?: { immediate?: boolean }) {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const execute = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.request<T>({
        url,
        method: "GET",
      });

      if (response.ok) {
        data.value = response.data;
      } else {
        error.value = response.error.message;
      }
    } catch {
      error.value = "Request failed";
    } finally {
      loading.value = false;
    }
  };

  if (options?.immediate !== false) {
    onMounted(() => {
      execute();
    });
  }

  return {
    data,
    loading,
    error,
    execute,
  };
}

// Example 4: Composable for mutations (POST, PUT, DELETE)
export function useMutation<TData = unknown, TVariables = unknown>() {
  const data = ref<TData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const mutate = async (
    url: string,
    method: "POST" | "PUT" | "DELETE" | "PATCH",
    variables?: TVariables,
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.request<TData>({
        url,
        method,
        body: variables,
      });

      if (response.ok) {
        data.value = response.data;
        return response.data;
      } else {
        error.value = response.error.message;
        throw new Error(response.error.message);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Request failed";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    mutate,
  };
}

// Example 5: Component usage
export default {
  setup() {
    const { users, loading, error, fetchUsers } = useUsers();

    return {
      users,
      loading,
      error,
      fetchUsers,
    };
  },
  template: `
    <div>
      <div v-if="loading">Loading...</div>
      <div v-else-if="error">Error: {{ error }}</div>
      <ul v-else>
        <li v-for="user in users" :key="user.id">
          {{ user.name }} - {{ user.email }}
        </li>
      </ul>
    </div>
  `,
};

// Example 6: Form submission with mutation
export function useCreateUser() {
  const { mutate, loading, error } = useMutation<{ id: string }, { name: string; email: string }>();

  const createUser = async (name: string, email: string) => {
    try {
      const result = await mutate("/users", "POST", { name, email });
      console.log("User created:", result);
      return result;
    } catch (err) {
      console.error("Failed to create user:", err);
      throw err;
    }
  };

  return {
    createUser,
    loading,
    error,
  };
}

// Example 7: Computed properties with API data
export function useUserStats() {
  const { users, loading } = useUsers();

  const totalUsers = computed(() => users.value.length);
  const activeUsers = computed(() => users.value.filter((u) => u.email).length);

  return {
    users,
    loading,
    totalUsers,
    activeUsers,
  };
}

