import * as React from 'react';
import '../styles/card.css';

function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-header ${className}`} {...props} />;
}

function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className={`card-title ${className}`} {...props} />;
}

function CardDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`card-description ${className}`} {...props} />;
}

function CardAction({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-action ${className}`} {...props} />;
}

function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-content ${className}`} {...props} />;
}

function CardFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-footer ${className}`} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
