// AuthManager - Handles Supabase Authentication & Admin Permissions
class AuthManager {
    constructor() {
        this.supabase = null;
        this.user = null;
        this.session = null;
        this.onAuthChangeCallbacks = [];
    }

    // Initialize AuthManager with existing Supabase client instance
    async initialize(supabaseClient) {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase client not provided to AuthManager');
            return false;
        }

        this.supabase = supabaseClient;

        try {
            // Get initial session
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) throw error;

            this.session = session;
            this.user = session ? session.user : null;

            // Listen for auth state changes (login, logout, token refresh)
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log(`🔐 Auth event: ${event}`, session?.user?.email || 'No user');
                this.session = session;
                this.user = session ? session.user : null;
                this.notifyAuthChange(event);
            });

            console.log('✅ AuthManager initialized. User:', this.user ? this.user.email : 'Guest');
            return true;
        } catch (err) {
            console.error('❌ Failed to initialize AuthManager:', err.message);
            return false;
        }
    }

    // Check if current user is logged in
    isLoggedIn() {
        return !!this.user;
    }

    // Check if current user has Admin privileges
    // Admin = any logged-in authenticated user (or matches specific admin criteria)
    isAdmin() {
        if (!this.user) return false;

        // If user metadata explicitly sets role or is_admin
        if (this.user.user_metadata?.is_admin === true || this.user.user_metadata?.role === 'admin') {
            return true;
        }

        // Default: Any authenticated user who logs in is treated as an authorized Uploader/Admin
        return true;
    }

    // Get current user email or display name
    getUserDisplayName() {
        if (!this.user) return 'Guest';
        return this.user.user_metadata?.full_name || this.user.email || 'User';
    }

    // Sign in with Email and Password
    async signIn(email, password) {
        if (!this.supabase) throw new Error('Auth not initialized');

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        this.user = data.user;
        this.session = data.session;
        return data;
    }

    // Sign up with Email and Password
    async signUp(email, password, options = {}) {
        if (!this.supabase) throw new Error('Auth not initialized');

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: options.fullName || email.split('@')[0],
                    ...options.data
                }
            }
        });

        if (error) throw error;
        return data;
    }

    // Sign out
    async signOut() {
        if (!this.supabase) return;

        const { error } = await this.supabase.auth.signOut();
        if (error) {
            console.warn('⚠️ Sign out error:', error.message);
        }
        this.user = null;
        this.session = null;
        this.notifyAuthChange('SIGNED_OUT');
    }

    // Subscribe to auth state changes
    onAuthChange(callback) {
        if (typeof callback === 'function') {
            this.onAuthChangeCallbacks.push(callback);
        }
    }

    // Notify all listeners
    notifyAuthChange(event) {
        this.onAuthChangeCallbacks.forEach(cb => {
            try {
                cb(event, this.user, this.isAdmin());
            } catch (err) {
                console.error('Error in auth change listener:', err);
            }
        });
    }
}

// Export globally
window.AuthManager = AuthManager;
