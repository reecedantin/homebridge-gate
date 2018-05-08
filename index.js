var Service;
var Characteristic;

var http = require('http')
var currentState = "CLOSED"
var targetState = "CLOSED"
var currentStopStatus = false;
var currentAutoStatus = false;


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-gate", "GATE", GateAccessory);
}

function GateAccessory(log, config) {
  this.log = log;

  this.name     = config['name']
  this.address  = config['address']
  this.port     = config['port']

  this.selfset = true

  this.service = new Service.GarageDoorOpener(this.name);

  this.service
      .getCharacteristic(Characteristic.CurrentDoorState)
      .on('get', this.getCurrentGateState.bind(this))
      .setValue(this.checkCurrentGateState(currentState));

  this.service
      .getCharacteristic(Characteristic.TargetDoorState)
      .on('get', this.getTargetGateState.bind(this))
      .on('set', this.setTargetGateState.bind(this))
      .setValue(Characteristic.CurrentDoorState.CLOSED);


  this.switchService = new Service.Switch(this.name + " STOP")
  this.switchService.subtype = "stop"
  this.switchService.getCharacteristic(Characteristic.On)
    .on('set', this.turnOnStop.bind(this))
    .on('get', this.getCurrentStopStatus);

  this.otherSwitchService = new Service.Switch(this.name + " AUTO")
  this.otherSwitchService.subtype = "automation"
  this.otherSwitchService.getCharacteristic(Characteristic.On)
    .on('set', this.turnOn.bind(this))
    .on('get', this.getCurrentAutoStatus);


  this.infoService = new Service.AccessoryInformation();

  this.infoService
      .setCharacteristic(Characteristic.Manufacturer, 'Gate Manufacturer')
      .setCharacteristic(Characteristic.Model, 'Gate Model')
      .setCharacteristic(Characteristic.SerialNumber, 'Gate Serial Number');
}


GateAccessory.prototype.setTargetGateState = function(state, callback) {
  if(this.selfset) {
      this.log("Gate selfset " + state)
      this.selfset = false
      callback()
      return
  }

  if(!state) {
        this.getPath('open', (res) => {
            if(res) {
                targetState = "OPEN";
                currentState = "OPEN";
                this.log("Gate Opened")
                this.service
                  .getCharacteristic(Characteristic.CurrentDoorState)
                  .setValue(Characteristic.CurrentDoorState.OPEN)
                callback()
            } else {
              callback(new Error("Gate disconnected"))
            }
        })
        service = this.service;
        setTimeout(function(service, selfset, log) {
            targetState = "CLOSED";
            currentState = "CLOSED";
            log("Gate Closed")
            selfset = true
            service
              .getCharacteristic(Characteristic.CurrentDoorState)
              .setValue(Characteristic.CurrentDoorState.CLOSED)
            selfset = true
            service
              .getCharacteristic(Characteristic.TargetDoorState)
              .setValue(Characteristic.TargetDoorState.CLOSED);
        }, 165000, service, this.selfset, this.log) //165 seconds
  } else {
        this.log("Closing Gate")
        this.getPath('close', (res) => {
            if(res) {
                this.service
                    .getCharacteristic(Characteristic.CurrentDoorState)
                    .setValue(Characteristic.CurrentDoorState.CLOSED);
                callback()
                targetState = "CLOSED";
                currentState = "CLOSED";
            } else {
                callback(new Error("Gate disconnected"))
            }
        })
  }
}

GateAccessory.prototype.getTargetGateState = function(callback) {
    callback(null, this.checkTargetGateState(targetState))
}

GateAccessory.prototype.getCurrentGateState = function(callback) {
    callback(null, this.checkCurrentGateState(currentState))
}

GateAccessory.prototype.checkCurrentGateState = function(state) {
  switch (state){
      case 'OPEN':
          return Characteristic.CurrentDoorState.OPEN;
      case 'CLOSED':
          return Characteristic.CurrentDoorState.CLOSED;
      case 'CLOSING':
          return Characteristic.CurrentDoorState.CLOSING;
      case 'OPENING':
          return Characteristic.CurrentDoorState.OPENING;
      case 'STOPPED':
      default:
          return Characteristic.CurrentDoorState.STOPPED;
  }
}

GateAccessory.prototype.checkTargetGateState = function(state) {
  switch (state){
      case 'OPEN':
          return Characteristic.CurrentDoorState.OPEN;
      case 'CLOSED':
      default:
          return Characteristic.CurrentDoorState.CLOSED;
  }
}


GateAccessory.prototype.turnOnStop = function(state, callback) {
    if(state) {
        this.getPath('stop', (res) => {
            if(res) {
                currentStopStatus = true
                callback()
            } else {
                callback(new Error("Gate disconnected"))
            }
        })
    } else {
        this.getPath('close', (res) => {
            if(res) {
                currentStopStatus = false
                callback()
            } else {
                callback(new Error("Gate disconnected"))
            }
        })
    }
}

GateAccessory.prototype.turnOn = function(state, callback) {
    if(state) {
        console.log("Gate Open")
        this.getPath('open', (res) => {
            if(res) {
                callback()
            } else {
                callback(new Error("Gate disconnected"))
            }
        })
    } else {
        this.getPath('close', (res) => {
            if(res) {
                callback()
            } else {
                callback(new Error("Gate disconnected"))
            }
        })
    }
}

GateAccessory.prototype.getCurrentStopStatus = function(callback) {
    return callback(null, currentStopStatus);
}

GateAccessory.prototype.getCurrentAutoStatus = function(callback) {
    return callback(null, currentAutoStatus);
}


GateAccessory.prototype.getServices = function() {
  return [this.service, this.switchService, this.otherSwitchService, this.infoService];
}

GateAccessory.prototype.getPath = function(path, callback) {
    var options = {
        hostname: this.address,
        port: this.port,
        path: '/' + path,
        timeout: 1000,
        method: 'GET'
    };

    var req = http.request(options, (res) => {
      res.setEncoding('utf8');

      res.on('data', (chunk) => {});

      res.on('end', () => {
          callback(true)
      });

      res.on('error', () => {
          callback(false)
      });
    });

    req.setTimeout(1000, () => {
        console.log("Timed out connecting to gate")
        req.abort()
    })

    req.on('error', (e) => {
        console.log(`Could not connect to gate: ${e.message}`);
        callback(false)
    });

    req.end();
}
