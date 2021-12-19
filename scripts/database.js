const db = require("../configuration/database.json")
const mysql = require('mysql2/promise')
const pool = mysql.createPool(db)

const fs = require('fs-extra')

const laptopSQL = fs.readFileSync(`${process.cwd()}/scripts/tables/laptops.sql`, 'utf-8')
const monitorSQL = fs.readFileSync(`${process.cwd()}/scripts/tables/monitors.sql`, 'utf-8')
console.log(laptopSQL)
;(async() => {
    try { 
        console.log("Starting database checks")
        const conn = await mysql.createConnection({multipleStatements: true, user: 'marcu', password: "", database: "computercheck",})
        
    
        await conn.query(laptopSQL)
        console.log("Completed laptop checks")
        await conn.query(monitorSQL)
        console.log("Completed monitor checks")
    
        
        console.log("Done!")
        
    } catch (e) {
        console.log(e)
    }
})();
