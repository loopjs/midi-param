var ObservStruct = require('observ-struct')
var ObservMidiPort = require('midi-port-holder')

var ObservMidiValue = require('observ-midi/value')
var Observ = require('observ')
var watch = require('observ/watch')

var computedPortNames = require('midi-port-holder/computed-port-names')
var Property = require('audio-slot/property')
var Param = require('audio-slot/param')

var Transform = require('audio-slot/modulators/transform')
var Event = require('geval')

module.exports = MidiParam

function MidiParam(context){

  var portHolder = ObservMidiPort({ global: true })
  var duplexPort = portHolder.stream

  var obs = ObservStruct({
    port: portHolder,
    message: Property('176/1'),
    learnNow: Property(false),
    minValue: Param(context, 0),
    maxValue: Param(context, 1)
  })

  obs.context = context
  obs._type = 'MidiParam'
  obs.portChoices = computedPortNames()
  obs.value = Observ(0)

  var lastMessage = null
  var observer = null
  watch(obs.message, function(message) {
    if (lastMessage !== message) {

      observer&&observer.destroy()
      observer = null

      if (message) {
        observer = ObservMidiValue(duplexPort, message)
        observer(obs.value.set)
      }
    }
  })

  // learn next message toggle
  var learning = false
  var releaseWatchLearn = null
  watch(obs.learnNow, function(learn) {
    if (learn !== learning) {
      if (learn) {
        learning = true
        releaseWatchLearn = watchMessage(duplexPort, function(value) {
          obs.message.set(value)
          obs.learnNow.set(false)
        })
      } else {
        learning = false
        releaseWatchLearn&&releaseWatchLearn()
        releaseWatchLearn = null
      }
    }
  })

  //transform: (value / 128) * (maxValue - minValue) + minValue
  var outputValue = Transform(context, [
    { param: obs.value },
    { value: 128, transform: divide },
    { param: Transform(context, [
      { param: obs.maxValue },
      { param: obs.minValue, transform: subtract }
    ]), transform: multiply },
    { param: obs.minValue, transform: add }
  ])

  // export scheduled params
  obs.onSchedule = outputValue.onSchedule
  obs.getValueAt = outputValue.getValueAt

  return obs
}

function watchMessage(midiStream, listener) {
  midiStream.on('data', onData)

  return function() {
    midiStream.removeListener('data', onData)
  }

  function onData(data) {
    listener(data[0] + '/' + data[1])
  }
}

// transform operations
function add(a, b) { return a + b }
function subtract(a, b){ return a - b }
function divide(a, b){ return b ? a / b : 0 }
function multiply(a, b) { return a * b }
