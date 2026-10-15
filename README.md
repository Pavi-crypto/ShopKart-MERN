# ShopKart 🛒

**ShopKart** is a web-based e-commerce application that allows users to browse products, add items to their shopping cart, and manage their shopping experience through a simple and intuitive interface.

## 📌 Project Overview

ShopKart is developed to demonstrate the implementation of an e-commerce website using modern web development technologies. It includes a product browsing interface, cart management, and communication between the frontend and backend.

## ✨ Features

- Browse and view available products
- Add products to wishlist
- Add products to the shopping cart
- View cart items and quantities
- Update or remove items from the cart
- Calculate the cart total
- Synchronize cart data between the frontend and backend
- Responsive and user-friendly interface

## 🛠️ Tech Stack

**Frontend**
- React.js
- Vite
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js

**Database**
MongoDB

**Tools**
- Git and GitHub
- Visual Studio Code
- npm

## 📂 Project Structure

```text
ShopKart/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```


## ⚙️ Installation and Setup

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/pavi-crypto/ShopKart-MERN.git
cd ShopKart-MERN
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Configure the required environment variables in a `.env` file, if applicable.

Example:

```env
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>

```

Start the backend using the appropriate script defined in `backend/package.json`, for example:

```bash
npm run dev
```

### 3. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal, usually `http://localhost:5173`.

## 🛒 Application Workflow

1. The user opens the ShopKart application.
2. The frontend displays the available products.
3. The user selects a product and clicks **Add to Cart**.
4. The application updates the cart and communicates with the backend, where applicable.
5. The user opens the cart to view the selected products and quantities.
6. The user can update quantities or remove products.
7. The cart displays the updated total based on the selected items.

## 🔐 Environment Variables

Store sensitive configuration values in a local `.env` file.

For example:

```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

## 🚀 Future Improvements

- User registration and login
- Product search and filtering
- Product categories
- Order placement and order history
- Payment gateway integration
- Product reviews and ratings
- Improved mobile responsiveness

## 👨‍💻 Author

**Name:** Pavithra

**GitHub:** https://github.com/Pavi-crypto

## 📄 License

This project is developed for educational purposes.
