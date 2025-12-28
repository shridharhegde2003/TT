'use client'

import { useState, useEffect, FormEvent, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ArrowLeft, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type ViewMode = 'initial' | 'login' | 'signup'

export default function AuthPage() {
    const [view, setView] = useState<ViewMode>('initial')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [mounted, setMounted] = useState(false)

    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    // Ensure component is mounted before enabling interactions
    useEffect(() => {
        setMounted(true)
    }, [])

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

    const handleSignInClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('Sign In clicked')
        setView('login')
        setPassword('')
        setFullName('')
    }

    const handleCreateAccountClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('Create Account clicked')
        setView('signup')
        setPassword('')
    }

    const handleBackClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('Back clicked')
        setView('initial')
        setEmail('')
        setPassword('')
        setFullName('')
    }

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log('Login form submitted')

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
                email: email.trim(),
                password,
            })

            if (error) {
                console.error('Login error:', error)
                toast({
                    title: 'Login Failed',
                    description: error.message.includes('Invalid login credentials')
                        ? 'Invalid email or password'
                        : error.message,
                    variant: 'destructive'
                })
            } else if (data.user) {
                toast({
                    title: 'Welcome Back!',
                    description: 'Successfully logged in',
                })

                // Check onboarding status
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('is_onboarded')
                    .eq('user_id', data.user.id)
                    .single()

                if (!profile || !profile.is_onboarded) {
                    router.push('/onboarding')
                } else {
                    router.push('/dashboard')
                }
            }
        } catch (error) {
            console.error('Login exception:', error)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log('Signup form submitted')

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
            console.log('Attempting signup for:', email.trim())

            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim()
                    }
                }
            })

            console.log('Signup response:', { data, error })

            if (error) {
                console.error('Signup error:', error)
                toast({
                    title: 'Sign Up Failed',
                    description: error.message,
                    variant: 'destructive'
                })
                return
            }

            if (data.user) {
                if (data.session) {
                    // User is logged in, redirect to onboarding
                    toast({
                        title: 'Account Created!',
                        description: 'Welcome to TimeTable Pro',
                    })
                    router.push('/onboarding')
                } else {
                    // Email confirmation required
                    toast({
                        title: 'Check Your Email',
                        description: 'Please verify your email to continue',
                    })
                    setView('login')
                }
            }
        } catch (error) {
            console.error('Signup exception:', error)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    // Don't render interactive elements until mounted
    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950" />
            <div className="absolute inset-0 hero-gradient dot-pattern" />
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
                            {view === 'initial' && 'Welcome'}
                            {view === 'login' && 'Sign In'}
                            {view === 'signup' && 'Create Account'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {view === 'initial' && 'Sign in to your account or create a new one'}
                            {view === 'login' && 'Enter your credentials to continue'}
                            {view === 'signup' && 'Fill in the details to get started'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Initial View */}
                        {view === 'initial' && (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={handleSignInClick}
                                    className="w-full h-12 rounded-lg font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateAccountClick}
                                    className="w-full h-12 rounded-lg font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
                                >
                                    Create New Account
                                </button>
                            </div>
                        )}

                        {/* Login View */}
                        {view === 'login' && (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="login-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 h-12"
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="login-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 h-12"
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-lg font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
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
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleBackClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateAccountClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Signup View */}
                        {view === 'signup' && (
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="signup-name"
                                            type="text"
                                            placeholder="Enter your full name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="pl-10 h-12"
                                            required
                                            autoComplete="name"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="signup-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 h-12"
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="signup-password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Create a password (min 6 characters)"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 h-12"
                                            required
                                            autoComplete="new-password"
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-lg font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
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
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleBackClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSignInClick}
                                        className="flex-1 h-10 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors cursor-pointer"
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
