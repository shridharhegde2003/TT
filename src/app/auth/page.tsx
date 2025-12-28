'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ArrowLeft, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AuthPage() {
    const [mode, setMode] = useState<'initial' | 'login' | 'signup'>('initial')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    // Check if user is already logged in
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
            toast({
                title: 'Missing Fields',
                description: 'Please enter both email and password',
                variant: 'destructive'
            })
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast({
                    title: 'Login Failed',
                    description: error.message.includes('Invalid login credentials')
                        ? 'Invalid email or password. If you are new, click "Create Account".'
                        : error.message,
                    variant: 'destructive'
                })
            } else if (data.user) {
                toast({
                    title: 'Welcome Back!',
                    description: 'Successfully logged in',
                })

                // Check if user has completed onboarding
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('is_onboarded')
                    .eq('user_id', data.user.id)
                    .single()

                if (profile && !profile.is_onboarded) {
                    router.push('/onboarding')
                } else {
                    router.push('/dashboard')
                }
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password || !fullName) {
            toast({
                title: 'Missing Fields',
                description: 'Please fill in all fields',
                variant: 'destructive'
            })
            return
        }

        if (password.length < 6) {
            toast({
                title: 'Password Too Short',
                description: 'Password must be at least 6 characters',
                variant: 'destructive'
            })
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            })

            if (error) {
                toast({
                    title: 'Sign Up Failed',
                    description: error.message,
                    variant: 'destructive'
                })
            } else if (data.user) {
                // Create user profile
                await supabase.from('user_profiles').insert([{
                    user_id: data.user.id,
                    full_name: fullName,
                    email: email,
                    is_onboarded: false
                }])

                if (data.session) {
                    toast({
                        title: 'Account Created!',
                        description: 'Welcome to TimeTable Pro',
                    })
                    router.push('/onboarding')
                } else {
                    toast({
                        title: 'Check Your Email',
                        description: 'We sent you a confirmation link.',
                    })
                    setMode('login')
                }
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    // Button click handlers
    const onSignInClick = () => {
        setMode('login')
        setPassword('')
        setFullName('')
    }

    const onCreateAccountClick = () => {
        setMode('signup')
        setPassword('')
    }

    const onBackClick = () => {
        setMode('initial')
        setEmail('')
        setPassword('')
        setFullName('')
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950" />
            <div className="absolute inset-0 hero-gradient dot-pattern" />

            {/* Decorative elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center space-x-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                            <Calendar className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gradient">TimeTable Pro</span>
                    </Link>
                </div>

                <Card className="premium-card border-0 shadow-2xl">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-2xl text-center">
                            {mode === 'initial' && 'Welcome'}
                            {mode === 'login' && 'Sign In'}
                            {mode === 'signup' && 'Create Account'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {mode === 'initial' && 'Sign in to your account or create a new one'}
                            {mode === 'login' && 'Enter your credentials to continue'}
                            {mode === 'signup' && 'Fill in the details to get started'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Initial Choice */}
                        {mode === 'initial' && (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={onSignInClick}
                                    className="w-full h-12 rounded-lg font-medium text-white btn-gradient flex items-center justify-center"
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={onCreateAccountClick}
                                    className="w-full h-12 rounded-lg font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                                >
                                    Create New Account
                                </button>
                            </div>
                        )}

                        {/* Login Form */}
                        {mode === 'login' && (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="login-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 h-12"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="login-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 h-12"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-lg font-medium text-white btn-gradient flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={onBackClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onCreateAccountClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Sign Up Form */}
                        {mode === 'signup' && (
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="signup-name"
                                            type="text"
                                            placeholder="Enter your full name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="pl-10 h-12"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="signup-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 h-12"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="signup-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Create a password (min 6 characters)"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 h-12"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-lg font-medium text-white btn-gradient flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={onBackClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onSignInClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                                    >
                                        Sign In Instead
                                    </button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Back to home link */}
                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
