import React from 'react';

const SplashScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 z-[9999]">
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-8 animate-bounce">
                    <span className="text-4xl font-bold text-primary">AJ</span>
                </div>

                <h1 className="text-3xl font-bold text-white tracking-widest mb-2">अलंकार ज्वेलर्स</h1>
                <p className="text-white/70 text-sm tracking-[0.2em] uppercase mb-12">Jewellery Shop Systems</p>

                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <p className="text-white font-medium animate-pulse ml-2 text-lg">Loading...</p>
                </div>
            </div>

            <div className="absolute bottom-10 text-white/40 text-xs font-mono tracking-tighter">
                INITIALIZING BUSINESS MODULES v2.1.0
            </div>
        </div>
    );
};

export default SplashScreen;
