/**
 * Angular Integration Example
 * 
 * This example shows how to use secure-fetch-client in an Angular application:
 * - Creating an injectable service
 * - Using with HttpClient
 * - Error handling with RxJS
 * - Dependency injection
 */

import { Injectable } from "@angular/core";
import { Observable, from, map, catchError, throwError } from "rxjs";
import { ApiClient } from "secure-fetch-client";
import type { ApiResponse } from "secure-fetch-client";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private client: ApiClient;

  constructor() {
    this.client = new ApiClient({
      baseUrl: "/api",
      defaultHeaders: {
        "x-client": "angular-app",
      },
    });
  }

  // Example 1: Basic service method
  getUsers(): Observable<ApiResponse<{ users: User[] }>> {
    return from(
      this.client.request<{ users: User[] }>({
        url: "/users",
        method: "GET",
      }),
    );
  }

  // Example 2: Service method with error handling
  getUser(id: string): Observable<User> {
    return from(
      this.client.request<User>({
        url: `/users/${id}`,
        method: "GET",
      }),
    ).pipe(
      map((response) => {
        if (response.ok) {
          return response.data;
        }
        throw new Error(response.error.message);
      }),
      catchError((error) => {
        console.error("API Error:", error);
        return throwError(() => error);
      }),
    );
  }

  // Example 3: Create user
  createUser(user: { name: string; email: string }): Observable<{ id: string }> {
    return from(
      this.client.request<{ id: string }>({
        url: "/users",
        method: "POST",
        body: user,
      }),
    ).pipe(
      map((response) => {
        if (response.ok) {
          return response.data;
        }
        throw new Error(response.error.message);
      }),
    );
  }

  // Example 4: Update user
  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return from(
      this.client.request<User>({
        url: `/users/${id}`,
        method: "PUT",
        body: updates,
      }),
    ).pipe(
      map((response) => {
        if (response.ok) {
          return response.data;
        }
        throw new Error(response.error.message);
      }),
    );
  }

  // Example 5: Delete user
  deleteUser(id: string): Observable<void> {
    return from(
      this.client.request({
        url: `/users/${id}`,
        method: "DELETE",
      }),
    ).pipe(
      map((response) => {
        if (!response.ok) {
          throw new Error(response.error.message);
        }
      }),
    );
  }

  // Example 6: Set authentication tokens
  setAuthTokens(accessToken: string, refreshToken?: string): Promise<void> {
    return this.client.setTokens({ accessToken, refreshToken });
  }

  // Example 7: Clear tokens
  clearAuthTokens(): Promise<void> {
    return this.client.clearTokens();
  }
}

// Component usage example
import { Component, OnInit } from "@angular/core";

interface User {
  id: string;
  name: string;
  email: string;
}

@Component({
  selector: "app-users",
  template: `
    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error">{{ error }}</div>
    <ul *ngIf="users">
      <li *ngFor="let user of users">{{ user.name }} - {{ user.email }}</li>
    </ul>
  `,
})
export class UsersComponent implements OnInit {
  users: User[] | null = null;
  loading = false;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = null;

    this.apiService.getUsers().subscribe({
      next: (response) => {
        if (response.ok) {
          this.users = response.data.users;
        } else {
          this.error = response.error.message;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }
}

// Example with async/await in component
@Component({
  selector: "app-user-profile",
  template: `
    <div *ngIf="user">
      <h1>{{ user.name }}</h1>
      <p>{{ user.email }}</p>
    </div>
  `,
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;

  constructor(private apiService: ApiService) {}

  async ngOnInit() {
    try {
      this.user = await firstValueFrom(this.apiService.getUser("123"));
    } catch (error) {
      console.error("Failed to load user:", error);
    }
  }
}

import { firstValueFrom } from "rxjs";

export { ApiService, UsersComponent, UserProfileComponent };

