import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState('Verifying your payment, please wait...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            setError('No payment session ID found. Redirecting...');
            setTimeout(() => navigate('/courses'), 3000); // Redirect to courses
            return;
        }

        const verifyPayment = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('You are not logged in. Redirecting...');
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                const { data } = await axios.post('/api/courses/verify-payment', 
                    { sessionId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setMessage(data.message || 'Payment verified! Redirecting to your dashboard...');
                // Redirect to dashboard on success
                setTimeout(() => navigate('/dashboard'), 2000);

            } catch (err) {
                const errorMsg = err.response?.data?.message || 'An error occurred during verification.';
                setError(errorMsg);
                // Redirect back to all courses on failure
                setTimeout(() => navigate('/courses'), 3000);
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
            <div>
                {error ? (
                    <>
                        <h1 className="text-3xl font-bold text-red-600">Payment Verification Failed</h1>
                        <p className="text-lg mt-2">{error}</p>
                        <p className="text-gray-500 mt-1">You will be redirected shortly.</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold text-green-600">Payment Successful!</h1>
                        <p className="text-lg mt-2">{message}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;