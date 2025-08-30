import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const courseId = searchParams.get('courseId');
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [courseTitle, setCourseTitle] = useState('Your Course');

    useEffect(() => {
        const handleSuccess = async () => {
            const token = localStorage.getItem('token');
            if (!token || !sessionId || !courseId) {
                navigate('/courses');
                return;
            }

            try {
                // Fetch course details to get the title
                const courseRes = await axios.get(`/api/courses/${courseId}`);
                setCourseTitle(courseRes.data.title);

                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                // Call a new backend endpoint to enroll the user.
                // We are not using webhooks for this example, but a webhook would be a more robust solution.
                const res = await axios.post(`/api/courses/${courseId}/enroll`, {}, config);
                console.log(res.data.message);
                
                // Dispatch event to update the header
                window.dispatchEvent(new Event("storageChanged"));
            } catch (err) {
                console.error('Enrollment error:', err);
                setError('Failed to enroll you in the course. Please contact support.');
            } finally {
                setLoading(false);
            }
        };

        handleSuccess();
    }, [sessionId, courseId, navigate]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">Processing your payment...</p></div>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg p-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg text-center space-y-6"
            >
                <CheckCircle2 size={64} className="text-green-500 mx-auto" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Successful!</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Congratulations! You have successfully enrolled in <span className="font-semibold">{courseTitle}</span>.
                </p>
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                    Go to Dashboard
                </Link>
            </motion.div>
        </div>
    );
};

export default PaymentSuccess;
