import React from "react";
import './aiChat.css';
import 'bootstrap/dist/css/bootstrap.min.css';

export const Button = ({ children, ...props }) => {
  return (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      {...props}
    >
      {children}
    </button>
  );
};