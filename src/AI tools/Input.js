import React from "react";
import './aiChat.css';
import 'bootstrap/dist/css/bootstrap.min.css';

export const Input = (props) => {
  return (
    <input
      className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  );
};