var Service;
var Characteristic;

var python = require('python-shell');

var currentState = "CLOSED";
var targetState = "CLOSED";


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-gate", "GATE", GateAccessory);
}

function GateAccessory(log, config) {
  this.log = log;

  this.name     = config['name'];
  this.pyloc     = config['pyloc'];

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

  this.infoService = new Service.AccessoryInformation();

  this.infoService
      .setCharacteristic(Characteristic.Manufacturer, 'Gate Manufacturer')
      .setCharacteristic(Characteristic.Model, 'Gate Model')
      .setCharacteristic(Characteristic.SerialNumber, 'Gate Serial Number');
}


GateAccessory.prototype.setTargetGateState = function(state, callback) {
  this.log("Gate is  " + targetState);
  if(!state)
  {
    targetState = "OPEN";
    if(currentState == "CLOSED" || currentState == "CLOSING")
    {
      currentState = "OPENING";
      python.run(this.pyloc, function (err){
        if(err) console.log(err);
      });
      this.service
          .getCharacteristic(Characteristic.CurrentDoorState)
          .setValue(this.checkCurrentGateState(currentState));
      setTimeout(function(log, service){
        //log("OPENED");
        currentState = "OPEN";
        service
            .getCharacteristic(Characteristic.CurrentDoorState)
            .setValue(Characteristic.CurrentDoorState.OPEN);

        setTimeout(function(log, service){
          //log("CLOSING");
          currentState = "CLOSING";
          targetState = "CLOSED";
          service
              .getCharacteristic(Characteristic.TargetDoorState)
              .setValue(Characteristic.TargetDoorState.CLOSED);

          setTimeout(function(log, service){
            //log("CLOSED");
            currentState = "CLOSED";
            service
                .getCharacteristic(Characteristic.CurrentDoorState)
                .setValue(Characteristic.CurrentDoorState.CLOSED);
          }, 15000, log, service); //15000
        }, 60000, log, service); //60000
      }, 15000, this.log, this.service); //15000

    }
  }
  else {
    targetState = "CLOSED";
    currentState = "CLOSING";
    this.service
        .getCharacteristic(Characteristic.CurrentDoorState)
        .setValue(Characteristic.CurrentDoorState.CLOSING);
  }
  callback();
  //this.log("got past set " + targetState);
}

GateAccessory.prototype.getTargetGateState = function(callback) {
    callback(null, this.checkTargetGateState(targetState));
}

GateAccessory.prototype.getCurrentGateState = function(callback) {
    callback(null, this.checkCurrentGateState(currentState));
    //this.log("GATE CURRENT STATUS = " + this.checkCurrentGateState(currentState) +" "+ currentState)
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

GateAccessory.prototype.getServices = function() {
  return [this.service, this.infoService];
}
