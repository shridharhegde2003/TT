'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function AuthPage() {
    const [mode, setMode] = useState<'choose' | 'login' | 'signup'>('choose')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                router.push('/dashboard')
            }
        }
        checkUser()
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
            return
        }

        setLoading(true)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            toast({ title: 'Login Failed', description: error.message, variant: 'destructive' })
        } else if (data.user) {
            toast({ title: 'Welcome!', description: 'Login successful' })
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('is_onboarded')
                .eq('user_id', data.user.id)
                .single()

            router.push(profile?.is_onboarded ? '/dashboard' : '/onboarding')
        }
        setLoading(false)
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password || !fullName) {
            toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
            return
        }
        if (password.length < 6) {
            toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' })
            return
        }

        setLoading(true)
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        })

        if (error) {
            toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' })
        } else if (data.user) {
            if (data.session) {
                // Create user profile after successful signup
                try {
                    await supabase.from('user_profiles').upsert({
                        user_id: data.user.id,
                        full_name: fullName,
                        email: email,
                        is_onboarded: false
                    }, { onConflict: 'user_id' })
                } catch (profileError) {
                    console.log('Profile creation will happen on first login')
                }

                toast({ title: 'Account Created!', description: 'Welcome to TimeTable Pro' })
                router.push('/onboarding')
            } else {
                toast({ title: 'Check Email', description: 'Please verify your email' })
                setMode('login')
            }
        }
        setLoading(false)
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: 'white',
                borderRadius: '16px',
                padding: '40px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '10px'
                    }}>
                        <span style={{ fontSize: '28px' }}>📅</span>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
                        TimeTable Pro
                    </h1>
                </div>

                {/* Choose Mode */}
                {mode === 'choose' && (
                    <div>
                        <h2 style={{ textAlign: 'center', fontSize: '20px', marginBottom: '10px', color: '#333' }}>
                            Welcome
                        </h2>
                        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px', fontSize: '14px' }}>
                            Sign in or create a new account
                        </p>

                        <button
                            onClick={() => setMode('login')}
                            style={{
                                width: '100%',
                                padding: '14px',
                                fontSize: '16px',
                                fontWeight: '600',
                                color: 'white',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                marginBottom: '12px'
                            }}
                        >
                            Sign In
                        </button>

                        <button
                            onClick={() => setMode('signup')}
                            style={{
                                width: '100%',
                                padding: '14px',
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#333',
                                background: 'white',
                                border: '2px solid #e0e0e0',
                                borderRadius: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            Create New Account
                        </button>
                    </div>
                )}

                {/* Login Form */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin}>
                        <h2 style={{ textAlign: 'center', fontSize: '20px', marginBottom: '25px', color: '#333' }}>
                            Sign In
                        </h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '16px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        paddingRight: '45px',
                                        fontSize: '16px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        color: '#666'
                                    }}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                fontSize: '16px',
                                fontWeight: '600',
                                color: 'white',
                                background: loading ? '#aaa' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                marginBottom: '16px'
                            }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => { setMode('choose'); setEmail(''); setPassword(''); }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    fontSize: '14px',
                                    color: '#666',
                                    background: '#f5f5f5',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                ← Back
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('signup'); setPassword(''); }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    fontSize: '14px',
                                    color: '#666',
                                    background: '#f5f5f5',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Create Account
                            </button>
                        </div>
                    </form>
                )}

                {/* Signup Form */}
                {mode === 'signup' && (
                    <form onSubmit={handleSignup}>
                        <h2 style={{ textAlign: 'center', fontSize: '20px', marginBottom: '25px', color: '#333' }}>
                            Create Account
                        </h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '16px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '16px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    required
                                    minLength={6}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        paddingRight: '45px',
                                        fontSize: '16px',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        color: '#666'
                                    }}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                fontSize: '16px',
                                fontWeight: '600',
                                color: 'white',
                                background: loading ? '#aaa' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                marginBottom: '16px'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Account'}
                        </button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => { setMode('choose'); setEmail(''); setPassword(''); setFullName(''); }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    fontSize: '14px',
                                    color: '#666',
                                    background: '#f5f5f5',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                ← Back
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('login'); setPassword(''); setFullName(''); }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    fontSize: '14px',
                                    color: '#666',
                                    background: '#f5f5f5',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Sign In Instead
                            </button>
                        </div>
                    </form>
                )}

                {/* Back to Home */}
                <div style={{ textAlign: 'center', marginTop: '25px' }}>
                    <Link href="/" style={{ color: '#667eea', textDecoration: 'none', fontSize: '14px' }}>
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
