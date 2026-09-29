// import React from 'react';
// import { Routes, Route, Navigate } from 'react-router-dom';
// import Sidebar from '../../components/shared/Sidebar';
// import WaiterTables from './WaiterTables';
// import WaiterOrders from './WaiterOrders';
// import WaiterBilling from './WaiterBilling';
// import { SocketProvider } from '../../context/SocketContext';
// import { useAuth } from '../../context/AuthContext';

// export default function WaiterLayout() {
//   const { user } = useAuth();
//   return (
//     <SocketProvider role="waiter">
//       <div className="app-layout">
//         <Sidebar role={user?.role === 'admin' ? 'admin' : 'waiter'} />
//         <div className="main-content">
//           <Routes>
//             <Route path="tables" element={<WaiterTables />} />
//             <Route path="orders" element={<WaiterOrders />} />
//             <Route path="billing" element={<WaiterBilling />} />
//             <Route path="*" element={<Navigate to="tables" />} />
//           </Routes>
//         </div>
//       </div>
//     </SocketProvider>
//   );
// }












// import React, { useState } from "react";
// import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

// import Sidebar from "../../components/shared/Sidebar";

// import WaiterTables from "./WaiterTables";
// import WaiterOrders from "./WaiterOrders";
// import WaiterBilling from "./WaiterBilling";

// import { SocketProvider } from "../../context/SocketContext";
// import { useAuth } from "../../context/AuthContext";


// export default function WaiterLayout() {


// const {user}=useAuth();

// const [menuOpen,setMenuOpen]=useState(false);

// const navigate=useNavigate();



// return (

// <SocketProvider role="waiter">


// <div className="waiter-layout">



// {/* MOBILE TOP HEADER */}

// <div className="mobile-header">


// <button
// className="menu-btn"
// onClick={()=>setMenuOpen(true)}
// >
// ☰
// </button>


// <div className="brand">

// 🍽 Delight

// </div>



// </div>





// {/* SIDEBAR */}


// <div
// className={
// menuOpen 
// ? "waiter-sidebar active"
// :
// "waiter-sidebar"
// }
// >


// <Sidebar

// role={
// user?.role==="admin"
// ?
// "admin"
// :
// "waiter"
// }

// />



// <button

// className="close-btn"

// onClick={()=>setMenuOpen(false)}

// >

// ✕

// </button>



// </div>






// {/* MAIN CONTENT */}



// <div className="waiter-content">


// <Routes>


// <Route

// path="tables"

// element={<WaiterTables/>}

// />



// <Route

// path="orders"

// element={<WaiterOrders/>}

// />



// <Route

// path="billing"

// element={<WaiterBilling/>}

// />



// <Route

// path="*"

// element={<Navigate to="tables"/>}

// />



// </Routes>



// </div>







// {/* MOBILE BOTTOM MENU */}



// <div className="mobile-bottom-nav">



// <button

// onClick={()=>{

// navigate("/waiter/tables")

// setMenuOpen(false)

// }}

// >


// 🪑

// <span>

// Tables

// </span>


// </button>





// <button

// onClick={()=>{

// navigate("/waiter/orders")

// setMenuOpen(false)

// }}

// >


// 📋

// <span>

// Orders

// </span>


// </button>





// <button

// onClick={()=>{

// navigate("/waiter/billing")

// setMenuOpen(false)

// }}

// >


// 💳

// <span>

// Billing

// </span>


// </button>



// </div>





// </div>



// </SocketProvider>


// )

// }




import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "../../components/shared/Sidebar";

import WaiterTables from "./WaiterTables";
import WaiterOrders from "./WaiterOrders";
import WaiterBilling from "./WaiterBilling";

import { SocketProvider } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";


export default function WaiterLayout(){

const {user}=useAuth();


return (

<SocketProvider role="waiter">


<div className="app-layout">


{/* SIDEBAR */}

<Sidebar

role={
user?.role==="admin"
?
"admin"
:
"waiter"
}

/>



{/* MAIN */}

<div className="main-content">


<Routes>


<Route

path="tables"

element={<WaiterTables/>}

/>



<Route

path="orders"

element={<WaiterOrders/>}

/>



<Route

path="billing"

element={<WaiterBilling/>}

/>



<Route

path="*"

element={<Navigate to="tables"/>}

/>


</Routes>



</div>



</div>



</SocketProvider>


)

}