const express = require('express')
const mqtt = require('mqtt')
const feedList = require('./feedList')
require('dotenv').config()
conn = require('dbadd.js')

const app = express()
app.use(express.json())

const client = mqtt.connect('https://io.adafruit.com', {
    username: process.env.IO_USERNAME,
    password: process.env.IO_PASSWORD
})

//Connect and subscribe to adafruit server
client.on('connect', () => {
    console.log("Connected to adafruit successfully")
    client.subscribe(feedList.map(feed => feed.link), (err) => {
        if (!err) console.log("Subscribe to all feeds")
    })
})

// Message received from subscibed topics
client.on('message', (topic, message) => {
    console.log("- Receive a message from", topic, ": ", message.toString())
})

app.post('/api/setting', (req, res) => {
    let feed = feedList.find(feed => feed.name == req.body.topic)
    let setting = req.body.setting 
    if (setting >= 0 && setting <= 100)
    {
        // let message = "Bạn đã điều chỉnh công suất bơm!"
        // client.publish(feed.link, message)
        // let message = {
        //     status: "Success",
        //     topic: req.body.topic,
        //     feed: feed.link,
        //     setting: setting
        // }
        let message = {
            "setting": setting * 2.55
        }
        let topic = {
            id: "10",
            name: "DRV_PWM",
            data: setting * 2.55,
            unit: ""
        }
        client.publish(feed.link, message)
        res.status(200).json(topic)
    }
    else
    {
        res.status(400).json({
            error: "Error, Invalid value!"
        })
    }
})

app.get('/api/setting', (req, res) => {
    let setting = req.body.setting 
    if (setting >= 0 && setting <= 100)
    {
        res.status(200).json({
            message: "Success"
        })
    }
    else
    {
        res.status(400).json({
            error: "ERROR MESSAGE"
        })
    }
})

app.put('/humid', (req, res) => {
    let top = req.body.top
    let bottom = req.body.bottom;
    
    if (top && bottom) {
        if (top > 1023 * 2.55) {
            res.status(400).send({error: "Top value too high"});
        } else if(bottom < 0) {
            res.status(400).send({error: "Bottom value toooo low"});
        }

        var message = {
            "top": top,
            "bottom": bottom
        };
        var humid = feedList[3]

        conn.query("UPDATE farm.sensor SET upper_bound = ? , lower_bound = ? WHERE system_id = '101'", [top, bottom], function (error, results, fields) {
            if (error) throw error;
            return res.status(200).send({
                status: "Added top and bottom value successfully",
                topic: humid.name,
                feed: humid.link,
                message: message
            });
        })
    } else {
        res.status(400).send({error: "Must have both top and bottom value"})
    }
})

app.post('/pub', (req, res) => {
    let message = req.body.message
    let feed = feedList.find(feed => feed.name === req.body.topic)
    
    if (!feed) {
        res.send("Invalid topic")
    } else if (message && feed) {
        client.publish(feed.link, message)
        res.json({
            status: "Success",
            topic: req.body.topic,
            feed: feed.link,
            message: message
        })
    } else {
        res.send("Body must contain topic and message")
    }
})

app.listen(5000, () => console.log("Server is running"))