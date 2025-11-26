import * as React from "react"
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export function AnimatedLogo({ className, ...props }: AnimatedLogoProps) {
    const [key, setKey] = useState(0);

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        setKey(prev => prev + 1);
        props.onClick?.(e);
    };

    React.useEffect(() => {
        const handleTrigger = () => {
            setKey(prev => prev + 1);
        };

        window.addEventListener('clickwise-trigger-logo-animation', handleTrigger);
        return () => {
            window.removeEventListener('clickwise-trigger-logo-animation', handleTrigger);
        };
    }, []);

    return (
        <svg
            key={key}
            width="256"
            height="256"
            viewBox="0 0 256 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("cursor-pointer", className)}
            onClick={handleClick}
            {...props}
        >
            <g clipPath="url(#clip0_712_3841)">
                <path
                    d="M74.6667 74.6667L58.6667 58.6667M160 74.6667L176 58.6667M58.6667 176L74.6667 160M117.333 53.3333V32M53.3333 117.333H32"
                    stroke="#00B8DB"
                    strokeWidth="10.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0"
                    transform="scale(0.8)"
                    style={{ transformOrigin: 'center' }}
                >
                    <animate
                        attributeName="opacity"
                        values="0; 0; 1; 1"
                        keyTimes="0; 0.25; 0.5; 1"
                        dur="0.6s"
                        begin="0s"
                        restart="always"
                        fill="freeze"
                    />
                    <animateTransform
                        attributeName="transform"
                        type="scale"
                        values="0.8; 0.8; 1.2; 1"
                        keyTimes="0; 0.25; 0.6; 1"
                        dur="0.6s"
                        begin="0s"
                        restart="always"
                        fill="freeze"
                        additive="sum"
                    />
                </path>
                <path
                    d="M183.043 181.213L224.554 164.97C229.075 163.201 229.073 156.803 224.551 155.036L124.791 116.052C120.462 114.361 116.191 118.631 117.883 122.961L156.866 222.721C158.634 227.243 165.031 227.245 166.8 222.723L183.043 181.213Z"
                    stroke="#00B8DB"
                    strokeWidth="10.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transformOrigin: 'center' }}
                >
                    <animateTransform
                        attributeName="transform"
                        type="scale"
                        values="1; 0.85; 1.1; 1"
                        keyTimes="0; 0.3; 0.7; 1"
                        dur="0.6s"
                        begin="0s"
                        restart="always"
                        fill="freeze"
                        additive="sum"
                    />
                </path>
            </g>
            <defs>
                <clipPath id="clip0_712_3841">
                    <rect width="256" height="256" rx="30" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
}
