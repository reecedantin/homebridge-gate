var Service;
var Characteristic;

var http = require('http')
var currentState = "CLOSED"
var targetState = "CLOSED"


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-gate", "GATE", GateAccessory);
}

function GateAccessory(log, config) {
  this.log = log;

  this.name     = config['name']

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

  this.switchService.getCharacteristic(Characteristic.On)
    .on('set', this.turnOnStop.bind(this));


  this.infoService = new Service.AccessoryInformation();

  this.infoService
      .setCharacteristic(Characteristic.Manufacturer, 'Gate Manufacturer')
      .setCharacteristic(Characteristic.Model, 'Gate Model')
      .setCharacteristic(Characteristic.SerialNumber, 'Gate Serial Number');
}


GateAccessory.prototype.setTargetGateState = function(state, callback) {
  this.log("Gate is  " + targetState);
  if(!state) {
        targetState = "OPEN";
        currentState = "OPEN";

        http.get("http://192.168.0.14:3000/open", (res) => {
          this.service
            .getCharacteristic(Characteristic.CurrentDoorState)
            .setValue(Characteristic.CurrentDoorState.OPEN)
        }).bind(this)

        setTimeout(function() {        
            this.service
            .getCharacteristic(Characteristic.CurrentDoorState)
            .setValue(Characteristic.CurrentDoorState.CLOSED)
        }, 90000)
  } else {
        targetState = "CLOSED";
        currentState = "CLOSED";
        http.get("http://192.168.0.14:3000/close", (res) => {
            this.service
                .getCharacteristic(Characteristic.CurrentDoorState)
                .setValue(Characteristic.CurrentDoorState.CLOSED);
        }).bind(this)
  }
  callback()
}

GateAccessory.prototype.getTargetGateState = function(callback) {
    callback(null, this.checkTargetGateState(targetState))
}

GateAccessory.prototype.getCurrentGateState = function(callback) {
    callback(null, this.checkCurrentGateState(currentState))
}

GateAccessory.prototype.checkCurrentGateState = function(state){
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

GateAccessory.prototype.checkTargetGateState = function(state){
  switch (state){
      case 'OPEN':
          return Characteristic.CurrentDoorState.OPEN;
      case 'CLOSED':
      default:
          return Characteristic.CurrentDoorState.CLOSED;
  }
}


GateAccessory.prototype.turnOnStop = function(state, callback){
    if(state) {
        http.get("http://192.168.0.14:3000/stop", (res) => {
            callback()
        });
    } else {
        http.get("http://192.168.0.14:3000/close", (res) => {
            callback()
        });
    }
}


GateAccessory.prototype.getServices = function() {
  return [this.service, this.switchService, this.infoService];
}
