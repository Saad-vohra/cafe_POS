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