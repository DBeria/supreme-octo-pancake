import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserCircle } from 'lucide-react';

// This is the same data as in Blog.jsx. In a real app, you would fetch this by slug from an API.
const blogPosts = [
    {
        slug: 'advanced-cardiac-ultrasound-views',
        title: 'Beyond the Basics: 5 Advanced Cardiac Ultrasound Views You Should Master',
        author: 'Dr. Evelyn Reed',
        date: 'August 30, 2025',
        category: 'Advanced Techniques',
        excerpt: 'The standard apical and parasternal views are essential, but mastering advanced techniques like the suprasternal and extended apical views can unlock critical diagnostic information. Discover five advanced views that will elevate your FATE protocol skills...',
        imageUrl: 'https://images.unsplash.com/photo-1580281657527-2b2a13945a2a?q=80&w=2048&auto=format&fit=crop',
        content: `
            <p class="mb-4 text-lg">The standard apical and parasternal views are the bread and butter of Focused Assessment with Transthoracic Echocardiography (FATE). But to truly harness the power of POCUS in complex cardiac cases, expanding your skillset is crucial. Here are five advanced views that can provide critical diagnostic information when the standard windows are not enough.</p>
            <h3 class="text-2xl font-bold mt-8 mb-3">1. The Suprasternal View</h3>
            <p class="mb-4">Often overlooked, the suprasternal view is invaluable for assessing the aortic arch, the brachiocephalic artery, and detecting conditions like aortic dissection or coarctation. By placing the probe in the suprasternal notch, you gain a unique perspective that no other view can offer.</p>
            <h3 class="text-2xl font-bold mt-8 mb-3">2. Extended Apical Views</h3>
            <p class="mb-4">Sometimes the standard apical 4-chamber view doesn't tell the whole story. Learning to tilt and rotate for the 5-chamber and 2-chamber views allows for better assessment of the aortic valve and LV outflow tract, as well as more precise evaluation of anterior and inferior wall motion.</p>
            <h3 class="text-2xl font-bold mt-8 mb-3">3. Extended Parasternal Views</h3>
            <p class="mb-4">The parasternal long-axis is a workhorse, but what about the right ventricular (RV) inflow view? By angling the transducer more medially and towards the right hip, you can specifically visualize the tricuspid valve and RV, which is critical in cases of suspected pulmonary embolism or RV dysfunction.</p>
            <h3 class="text-2xl font-bold mt-8 mb-3">4. Basic Doppler Application</h3>
            <p class="mb-4">While a full Doppler study is the domain of formal echocardiography, basic Doppler skills are a game-changer in POCUS. Using color Doppler to quickly identify valvular regurgitation or pulsed-wave Doppler to get a rough estimate of cardiac output can drastically alter patient management in real-time.</p>
            <h3 class="text-2xl font-bold mt-8 mb-3">5. Pressure Estimation Techniques</h3>
            <p class="mb-4">Understanding how to use ultrasound to estimate pressures, such as central venous pressure (CVP) via IVC assessment, is a cornerstone of advanced FATE. This non-invasive technique provides vital hemodynamic information at the bedside, guiding fluid resuscitation and vasopressor therapy.</p>
            <p class="mt-8 font-semibold">Mastering these views and techniques takes practice, but they will undoubtedly make you a more confident and capable POCUS practitioner. Our <strong>Advanced Cardiac Ultrasound (FATE)</strong> course is designed to give you the hands-on training you need to master these skills.</p>
        `
    },
    {
        slug: 'a-day-in-the-life-with-fate',
        title: 'From Theory to Practice: A Day in the Life with FATE',
        author: 'Dr. Kenji Tanaka',
        category: 'Clinical Cases',
        date: 'August 22, 2025',
        excerpt: 'How does the Basic Focused Cardiac Ultrasound (FATE) protocol translate to real-world clinical scenarios? Follow along as we break down a typical day in the ICU, applying FATE to assess IVC, estimate pressure, and guide treatment decisions.',
        imageUrl: 'https://images.unsplash.com/photo-1551193583-99a9b0c5a47e?q=80&w=2048&auto=format&fit=crop',
        content: '<p>Content for this blog post is coming soon!</p>'
    },
    {
        slug: 'ultrasound-in-the-er',
        title: 'Ultrasound in the ER: How Essential Emergency Ultrasound Saves Lives',
        author: 'Dr. Maria Flores',
        category: 'Emergency Medicine',
        date: 'August 15, 2025',
        excerpt: 'In the fast-paced environment of the emergency room, quick and accurate diagnostics are paramount. Learn how the Essential Emergency Ultrasound Course provides the skills to rapidly assess patients and make life-saving interventions.',
        imageUrl: 'https://images.unsplash.com/photo-1628334882277-3523c533f85a?q=80&w=2048&auto=format&fit=crop',
        content: '<p>Content for this blog post is coming soon!</p>'
    }
];

const BlogPost = () => {
    const { slug } = useParams();
    const post = blogPosts.find(p => p.slug === slug);

    if (!post) {
        return (
            <div className="text-center py-20">
                <h1 className="text-4xl font-bold">Post not found</h1>
                <Link to="/blog" className="mt-6 inline-block text-blue-500 hover:underline">Back to Blog</Link>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900">
            {/* Header Section with Background Image */}
            <div className="relative h-96 w-full">
                <img src={post.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60"></div>
                <div className="container mx-auto px-6 h-full flex flex-col justify-center relative text-white">
                    <span className="text-sm font-semibold uppercase px-3 py-1 bg-blue-500 text-white rounded-full self-start mb-4">{post.category}</span>
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight max-w-4xl">{post.title}</h1>
                    <p className="text-lg text-slate-300 mt-4">{post.date}</p>
                </div>
            </div>
            
            {/* Article Content Section */}
            <article className="container mx-auto px-6 py-12 max-w-4xl">
                <div className="mb-8">
                    <Link to="/blog" className="group inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold">
                        <ArrowLeft size={18} className="mr-2 transition-transform transform group-hover:-translate-x-1" />
                        Back to All Articles
                    </Link>
                </div>

                <div 
                    className="prose prose-lg dark:prose-invert max-w-none prose-h3:text-gray-800 dark:prose-h3:text-gray-100"
                    dangerouslySetInnerHTML={{ __html: post.content }} 
                />

                {/* Author Bio */}
                <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <UserCircle size={64} className="text-slate-400 dark:text-slate-500" />
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">WRITTEN BY</p>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{post.author}</h4>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default BlogPost;