import * as React from 'react';
import '../styles/button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

function Button({ className = '', variant = 'default', size = 'default', ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} />;
}

export { Button };
