/**
 * Created by atg on 21/07/2014.
 */

//Globals
var GROUND_DEPTH = 10;
var GROUND_WIDTH = 180;
var SCREEN_WIDTH = 90;
var SCREEN_HEIGHT = 40;

function eliminateDuplicates(arr) {
    var r = [];
    start: for(var i = 0; i < arr.length; ++i) {
        for(var x = 0; x < r.length; ++x) {
            if(r[x]==arr[i]) {
                continue start;
            }
        }
        r[r.length] = arr[i];
    }
    return r;
}

var daysMonth = {'Jan':31, 'Feb':28, 'Mar':31, 'Apr':30, 'May':31, 'Jun':30,
    'Jul':31, 'Aug':31, 'Sep':30, 'Oct':31, 'Nov':30, 'Dec':31};

var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu','Fri', 'Sat'];

function daysPerMonth(month) {
    return daysMonth[month];
}

function getNextDay(day) {
    //Get next day of week
    for(var i=0; i<dayNames.length; ++i) {
        if(day == dayNames[i]) {
            ++i;
            return i<dayNames.length ? dayNames[i] : dayNames[0];
        }
    }
}

function getPreviousDay(day) {
    //Get previous day of the week
    for(var i=0; i<dayNames.length; ++i) {
        if (day == dayNames[i]) {
            --i;
            return i < 0 ? dayNames[6] : dayNames[i];
        }
    }
}

function getDayName(date) {
    //Get name of day - always first 3 letters
    return date.substr(0, 3);
}

function getDate(date) {
    //Get day number - could be single or double figures
    var day = date.substr(4, 2);
    if(parseInt(day) < 10) {
        day = date.substr(4, 1);
    }
    return day;
}

function getMonth(date) {
    //Get month string
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for(var i=0; i<months.length; ++i) {
        if(date.indexOf(months[i]) >= 0) return months[i];
    }

    return null;
}

function getHour(date) {
    //Get hour string
    var hour = date.substr(17, 3);
    return parseInt(hour);
}

function getMaxOccupancy(name) {
    //max occupancy at end of file
    var max = name.indexOf('(');
    if(max >= 0) {
        return parseInt(name.substr(max+1, 3));
    }

    return -1;
}

function getOccupancyGroup(screenGroup) {
    //Get occupancy group from given group
    for(var i=0; i<screenGroup.children.length; ++i) {
        if(screenGroup.children[i].name.indexOf('Occupancy') >=0) {
            return screenGroup.children[i];
            break;
        }
    }

    return null;
}

//Init this app from base
function EnergyApp() {
    BaseApp.call(this);
}

EnergyApp.prototype = new BaseApp();

EnergyApp.prototype.init = function(container) {
    BaseApp.prototype.init.call(this, container);
    this.data = null;
    this.updateRequired = false;
    this.guiControls = null;
    this.dataFile = null;
    this.filename = '';
    this.objectsRendered = 0;
    //Animation
    this.totalDelta = 0;
    this.startRot;
    this.rotInc = Math.PI/180 * 72;
    this.animate = false;
    this.animating = false;
    this.animationTime = 2;
};

EnergyApp.prototype.update = function() {
    //Perform any updates
    var delta = this.clock.getDelta();
    var clicked = this.mouse.clicked;

    //Perform mouse hover
    var vector = new THREE.Vector3(( this.mouse.x / window.innerWidth ) * 2 - 1, -( this.mouse.y / window.innerHeight ) * 2 + 1, 0.5);
    this.projector.unprojectVector(vector, this.camera);

    var raycaster = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());

    this.hoverObjects.length = 0;
    this.hoverObjects = raycaster.intersectObjects(this.scene.children, true);

    //Check hover actions
    if(this.hoverObjects.length != 0) {
        for(var i=0; i<this.hoverObjects.length; ++i) {

        }
    }

    //Animation
    if(this.animating) {
        this.root.rotation.y += (delta/this.animationTime) * this.rotInc;
        this.totalDelta += delta;
        if(this.totalDelta >= this.animationTime) {
            this.animating = false;
            this.totalDelta = 0;
            this.root.rotation.y = this.startRot + this.rotInc;
        }
    }
    BaseApp.prototype.update.call(this);
};

EnergyApp.prototype.createScene = function() {
    //Init base createsScene
    BaseApp.prototype.createScene.call(this);

    this.root = new THREE.Object3D();
    this.root.name = 'root';
    this.scene.add(this.root);

    this.screenGroups = [];
    //Model loading
    //Load models but don't add to scene yet
    var _this = this;
    this.modelLoader = new THREE.JSONLoader();
    this.modelLoader.load('models/person2.js', function(geom, material) {
        //Save geometry for later
        _this.personGeom = geom;
    });
    //Create screen
    this.modelLoader.load('models/screen.js', function(geom, materials) {
        //Model loaded, create groups, etc.
        _this.screenGeometry = geom;
        var material = new THREE.MeshLambertMaterial(materials);
        _this.screenMaterial = material;
    });
};

EnergyApp.prototype.createEnvironment = function() {
    //Create world structure
    var xPos = [0, 95, 58.8, -58.8, -95];
    var zPos = [100, 31, -81, -81, 31];
    var screenName = ['Lounge', 'Screen1', 'Screen2', 'Screen3', 'Screen4'];
    var scalingFactor = 1.5;
    //Group properties
    var occupancies = [];
    var occupancyScale = new THREE.Vector3(1, 1, 1);
    var occupancyPerRow = 10;
    var startPos = new THREE.Vector3(-22.5, -56, 30);
    var increments = new THREE.Vector3(5, 0, 5);

    var occupancyGroup = {'occupancyScale' : occupancyScale, 'occupancyPerRow' : occupancyPerRow, 'startPos' : startPos, 'increments' : increments};
    //Lounge
    occupancies.push(occupancyGroup);
    //Screen 1
    occupancyScale = new THREE.Vector3(0.5, 0.5, 0.5);
    occupancyPerRow = 30;
    startPos = new THREE.Vector3(-70, -56, -10);
    occupancyGroup = {'occupancyScale' : occupancyScale, 'occupancyPerRow' : occupancyPerRow, 'startPos' : startPos, 'increments' : increments};
    occupancies.push(occupancyGroup);
    for(var i=2; i<5; ++i) {
        occupancies.push(occupancyGroup);
    }

    for(var i=0; i<this.locationNames.length; ++i) {
        var group = new THREE.Object3D();
        group.name = this.locationNames[i];
        group.position.set(xPos[i], 0, zPos[i]);
        group.position.multiplyScalar(scalingFactor);
        this.screenGroups.push(group);
        var occupancy = new THREE.Object3D();
        occupancy.name = 'Occupancy' + group.name;
        occupancy.properties = occupancies[i];
        group.add(occupancy);
        addGround(group, GROUND_WIDTH, GROUND_DEPTH);
        //Add screen
        var screen = new THREE.Mesh(this.screenGeometry, this.screenMaterial);
        screen.name = 'Screen';
        screen.scale.x = 1.25;
        screen.position.y = -40;
        screen.position.z = -20;
        group.add(screen);
        var title = createScreenTitle(screenName[i]);
        title.position.y = -27.5;
        title.position.z = -20;
        group.add(title);
        group.rotation.y = this.rotInc * i;
        this.root.add(group);
    }
};

EnergyApp.prototype.createGUI = function() {
    //Create GUI - use dat.GUI for now
    this.guiControls = new function() {
        this.filename = '';

        //Colours
        this.Ground = '#1a2f46';
        this.Background = '#5c5f64';
    };

    //Create GUI
    var gui = new dat.GUI();
    var _this = this;
    //Create two folders - Appearance and Data
    gui.add(this.guiControls, 'filename', this.filename).listen();
    this.guiAppear = gui.addFolder("Appearance");

    this.guiAppear.addColor(this.guiControls, 'Ground').onChange(function(value) {
        _this.groundColourChanged(value);
    });
    this.guiAppear.addColor(this.guiControls, 'Background').onChange(function(value) {
        _this.renderer.setClearColor(value, 1.0);
    });
    this.guiData = gui.addFolder("Data");
};

EnergyApp.prototype.generateGUIControls = function() {

};

EnergyApp.prototype.groundColourChanged = function(value) {
    var ground = this.scene.getObjectByName('ground');
    if(ground) {
        ground.material.color.setStyle(value);
    }
};

/*
EnergyApp.prototype.generateData = function() {
    //Parse data and rewrite in more suitable format
    var selected = ['hall_name_1', 'event_date_grouping', 'show_count_1', 'total_tkt_count_1', 'total_tkt_count_2'];
    var altered = ['hall_name', 'event_date', 'show_count', 'occupancy', 'admits'];
    var occupancy = [];
    for(var i=0; i<this.data.length; ++i) {
        //Only save selected data
        var newData = {};
        var item = this.data[i];
        for(var key in item) {
            for(var j=0; j<selected.length; ++j) {
                if(key == selected[j]) {
                    newData[altered[j]] = item[selected[j]];
                    break;
                }
            }
        }
        occupancy.push(newData);
    }
    //Save new data structure
    var bb = window.Blob;
    var filename = 'energy.json';
    saveAs(new bb(
            [JSON.stringify(occupancy)]
            , {type: "text/plain;charset=" + document.characterSet}
        )
        , filename);
};
*/

EnergyApp.prototype.generateData = function() {
    //Extract data - do this manually for now
    var item = this.data[0];
    this.currentDataLocation = 0;
    this.currentLocation = 0;
    this.currentLocationName = item['hall_name'];
    var dayName = getDayName(item['event_date']);
    this.dayName = dayName;
    var date = getDate(item['event_date']);
    this.date = parseInt(date);
    var month = getMonth(item['event_date']);
    this.month = month;
    var hour = getHour(item['event_date']);
    console.log('Hour =', hour);
    this.hour = hour;

    this.locationNames = [];
    //Separate location names
    for(var i=0; i<this.data.length; ++i) {
        item = this.data[i];
        this.locationNames.push(item['hall_name']);
    }
    //Remove duplicates
    this.locationNames = eliminateDuplicates(this.locationNames);

    //Get max occupancy from group name
    this.maxOccupancy = [];
    for(var i=0; i<this.locationNames.length; ++i) {
        var max = getMaxOccupancy(this.locationNames[i]);
        if(max > 0) {
            this.maxOccupancy.push(max);
        }
    }

    //Generate occupancy visuals
    this.createEnvironment();

    var item = this.data[0];
    populateInfoPanel(item);
    //Set current group
    var screenGroup = this.screenGroups[this.currentLocation];
    var occupyGroup = getOccupancyGroup(screenGroup);

    populateHall(occupyGroup, this.personGeom, item['admits'], this.maxOccupancy[0]);
};

EnergyApp.prototype.findDate = function(dayName, day, month, hour) {
    //Construct date and find in data
    var eventDate = dayName+' '+day+' '+month+' 2014 - '+hour+':00 - '+hour+':59';
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item['event_date'] == eventDate) {
            return item;
        }
    }

    return null;
};

EnergyApp.prototype.getLocation = function(item) {
    //Get location of item within data
    for(var i=0; i<this.data.length; ++i) {
        var obj = this.data[i];
        if(obj == item) {
            return i;
        }
    }

    return null;
};

EnergyApp.prototype.showPreviousLocation = function() {
    //Rotate screen structures
    this.startRot = this.root.rotation.y;
    if(this.rotInc < 0) this.rotInc *= -1;
    this.animating = true;

    //Get data for previous location
    if(--this.currentLocation < 0) this.currentLocation = this.screenGroups.length-1;
    this.currentLocationName = this.locationNames[this.currentLocation];

    //Construct date
    var eventDate = this.dayName+' '+this.date+' '+this.month+' 2014 - '+this.hour+':00 - '+this.hour+':59';
    //Update current variables to something sensible
    //even if no exact match
    var resetPoint = -1;
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item['hall_name'] == this.currentLocationName) {
            //We may need this later
            if(resetPoint < 0) resetPoint = i;
            if(item['event_date'] == eventDate) {
                populateInfoPanel(item);
                this.currentDataLocation = i;
                return;
            }
        }
    }
    //Didn't find exact match
    //Set data pointers to sensible position
    this.currentDataLocation = resetPoint;
    var data = jQuery.extend({}, this.data[resetPoint]);
    data['event_date'] = eventDate;
    data['admits'] = -1;
    data['occupancy'] = -1;
    populateInfoPanel(data);
    //Set current group
    var screenGroup = this.screenGroups[this.currentLocation];
    var occupyGroup = getOccupancyGroup(screenGroup);
    populateHall(occupyGroup, this.personGeom, -1, -1);
    console.log('No data for that date');
};

EnergyApp.prototype.showNextLocation = function() {
    //Rotate screen structures
    this.startRot = this.root.rotation.y;
    if(this.rotInc > 0) this.rotInc *= -1;
    this.animating = true;

    //Get data for next location
    if(++this.currentLocation >= this.screenGroups.length) this.currentLocation = 0;
    this.currentLocationName = this.locationNames[this.currentLocation];

    //Construct date
    var eventDate = this.dayName+' '+this.date+' '+this.month+' 2014 - '+this.hour+':00 - '+this.hour+':59';
    console.log('Date = ', eventDate);
    //Update current variables to something sensible
    //even if no exact match
    var resetPoint = -1;
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item['hall_name'] == this.currentLocationName) {
            //we may need this later
            if(resetPoint < 0) resetPoint = i;
            if(item['event_date'] == eventDate) {
                populateInfoPanel(item);
                this.currentDataLocation = i;
                return;
            }
        }
    }
    //Didn't find exact match
    //Set data pointers to sensible position
    this.currentDataLocation = resetPoint;
    var data = jQuery.extend({}, this.data[resetPoint]);
    data['event_date'] = eventDate;
    data['admits'] = -1;
    data['occupancy'] = -1;
    populateInfoPanel(data);
    //Set current group
    var screenGroup = this.screenGroups[this.currentLocation];
    var occupyGroup = getOccupancyGroup(screenGroup);
    populateHall(occupyGroup, this.personGeom, -1, -1);
    console.log('No data for that date');
};

EnergyApp.prototype.showPreviousTime = function() {
    //Go to previous time for selected location
    if(this.currentDataLocation == 0) return;

    var item = this.data[this.currentDataLocation-1];
    if(item['hall_name'] != this.currentLocationName) return;

    --this.currentDataLocation;
    //Update all date variables
    var date = item['event_date'];
    this.dayName = getDayName(date);
    this.date = parseInt(getDate(date));
    this.hour = parseInt(getHour(date));
    populateInfoPanel(item);
    //Set current group
    var screenGroup = this.screenGroups[this.currentLocation];
    var occupyGroup = getOccupancyGroup(screenGroup);
    populateHall(occupyGroup, this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
};

EnergyApp.prototype.showNextTime = function() {
    //Go to next time for selected location
    var item = this.data[this.currentDataLocation+1];
    if(item['hall_name'] != this.currentLocationName) return;

    ++this.currentDataLocation;
    //Update all date variables
    var date = item['event_date'];
    this.dayName = getDayName(date);
    this.date = parseInt(getDate(date));
    this.hour = parseInt(getHour(date));
    populateInfoPanel(item);
    //Set current group
    var screenGroup = this.screenGroups[this.currentLocation];
    var occupyGroup = getOccupancyGroup(screenGroup);
    populateHall(occupyGroup, this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
};

EnergyApp.prototype.showPreviousDay = function() {
    //Construct previous day from current day
    if(this.date-1 < 1) return;

    var date = this.date-1;
    var hour = this.hour;
    var month = this.month;
    var dayName = getPreviousDay(this.dayName);

    var item = this.findDate(dayName, date, month, hour);
    if(item != null) {
        //Only display data for this location
        if(item['hall_name'] != this.currentLocationName) return;
        //Update date info
        this.dayName = dayName;
        --this.date;
        this.currentDataLocation = this.getLocation(item);
        populateInfoPanel(item);
        //Set current group
        var screenGroup = this.screenGroups[this.currentLocation];
        var occupyGroup = getOccupancyGroup(screenGroup);
        populateHall(occupyGroup, this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
    } else {
        console.log('No data for that event');
    }
};

EnergyApp.prototype.showNextDay = function() {
    //Construct next day from current day
    if(this.date+1 > daysPerMonth(this.month)) return;

    var date = this.date+1;
    var dayName = getNextDay(this.dayName);
    var hour = this.hour;
    var month = this.month;

    var item = this.findDate(dayName, date, month, hour);
    if(item != null) {
        //Only display data for this location
        if(item['hall_name'] != this.currentLocationName) return;
        //Update date info
        this.dayName = dayName;
        ++this.date;
        this.currentDataLocation = this.getLocation(item);
        populateInfoPanel(item);
        //Set current group
        var screenGroup = this.screenGroups[this.currentLocation];
        var occupyGroup = getOccupancyGroup(screenGroup);
        populateHall(occupyGroup, this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
    } else {
        console.log('No data for that event');
    }
};

EnergyApp.prototype.onKeyDown = function(event) {
    switch (event.keyCode) {
        case 80: //'P'
            console.log("CamPos=", this.camera.position);
            console.log("Lookat=", this.controls.getLookAt());
            break;
    }
};

EnergyApp.prototype.parseFile = function() {
    //Attempt to load and parse given json file
    if(!this.filename) return;

    console.log("Reading file...");

    var reader = new FileReader();
    var _this = this;
    reader.onload = function(evt) {
        //File loaded - parse it
        console.log('file read: '+evt.target.result);
        try {
            _this.data = JSON.parse(evt.target.result);
        }
        catch (err) {
            console.log('error parsing JSON file', err);
            alert('Sorry, there was a problem reading that file');
            return;
        }
        //File parsed OK - generate GUI controls and data
        _this.generateGUIControls();
        _this.generateData();
        _this.updateRequired = true;
    };

    // Read in the file
    reader.readAsText(this.dataFile, 'ISO-8859-1');
};

EnergyApp.prototype.onSelectFile = function(evt) {
    //User selected file
    //See if we support filereader API's
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        //File APIs are supported.
        var files = evt.target.files; // FileList object
        if (files.length==0) {
            console.log('no file specified');
            this.filename = "";
            return;
        }
        //Clear old data first
        if(this.dataFile) {
            this.reset();
        }
        this.dataFile = files[0];
        this.filename = this.dataFile.name;
        console.log("File chosen", this.filename);

        //Try and read this file
        this.parseFile();
    }
    else
        alert('sorry, file apis not supported');
};

function addGround(group, width, height) {
    //Create the ground object
    var groundGeometry = new THREE.CylinderGeometry(width/2, width/2, height, 12, 12, false);
    var texture = THREE.ImageUtils.loadTexture("images/grid.png");
    var planeMaterial = new THREE.MeshLambertMaterial({color : 0x1a2f46});
    var plane = new THREE.Mesh(groundGeometry, planeMaterial);
    //Give it a name
    plane.name = 'ground';
    //plane.receiveShadow  = true;

    // rotate and position the plane
    //plane.rotation.x=-0.5*Math.PI;
    plane.position.x=0;
    plane.position.y=-65;
    plane.position.z=0;

    group.add(plane);

    //Second plane
    groundGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
    planeMaterial = new THREE.MeshLambertMaterial({color: 0x16283c});
    plane = new THREE.Mesh(groundGeometry, planeMaterial);
    plane.rotation.x=-0.5*Math.PI;
    plane.position.x=0;
    plane.position.y=-60;
    plane.position.z=0;
    //Give it a name
    plane.name = 'ground';

    // add the plane to the scene
    //scene.add(plane);
}

function populateHall(group, geom, occupancy, maxOccupancy) {
    //Add number of people to location
    if(group.children.length > 0) {
        for (var child = group.children.length - 1; child >= 0; --child) {
            group.remove(group.children[child]);
        }
    }

    var occupyMaterial = new THREE.MeshLambertMaterial({color : 0x000066});
    var surplusMaterial = new THREE.MeshLambertMaterial({color : 0xffffff});

    if(occupancy == -1) {
        var unknownGeom = new THREE.PlaneGeometry(20, 5);
        var unknown = new THREE.Mesh(unknownGeom, occupyMaterial);
        unknown.position.set(0, -60, 0);
        group.add(unknown);
        return;
    }

    //Get group properties
    var props = group.properties;
    var startPos = props['startPos'];
    var scale = props['occupancyScale'];
    var xInc = props['increments'].x;
    var zInc = props['increments'].z;
    var occPerRow = props['occupancyPerRow'];
    for(var i=0; i<maxOccupancy; ++i) {
        var person = new THREE.Mesh(geom, i<occupancy ? occupyMaterial : surplusMaterial);
        person.scale.set(scale.x, scale.y, scale.z);
        person.position.x = startPos.x + (i%occPerRow * xInc);
        person.position.y = startPos.y;
        person.position.z = startPos.z + (parseInt(i/occPerRow)*zInc);
        group.add(person);
    }
}

function createScreenTitle(title) {
    //Create rectangle with given text
    var rectGeom = new THREE.PlaneGeometry(20, 6, 4, 4);

    var fontface = "Arial";
    var fontSize = 12;
    var spacing = 10;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var metrics = context.measureText( title );
    var textWidth = metrics.width;

    canvas.width = textWidth + (spacing * 2);
    canvas.width *= 2;
    canvas.height = fontSize;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillStyle = "rgba(255, 115, 41, 1.0)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(255, 255, 255, 1.0)";
    context.font = fontSize + "px " + fontface;

    context.fillText(title, canvas.width/2, canvas.height/2);
    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var rectMaterial = new THREE.MeshLambertMaterial({map : texture});
    return new THREE.Mesh(rectGeom, rectMaterial);
}

function populateInfoPanel(data) {
    //Fill panel with relevant data

    for(var key in data) {
        var item = document.getElementById(key);
        if (item) {
            item.innerHTML = data[key] != -1 ? data[key] : 'n/a';
        }
    }

    //Remove any unnecessary data in headings
    var title = data['hall_name'];
    var end = title.indexOf('(');
    if(end >= 0) {
        title = title.substr(0, end);
        document.getElementById('hall_name').innerHTML = title;
    }

    //Separate date and time
    var date = data['event_date'];
    var join = date.indexOf('-');
    if(join >= 0) {
        var day = date.substr(0, join-1);
        document.getElementById('event_date').innerHTML = day;
    }
    var time = date.substr(join+1, date.length-join);
    document.getElementById('event_time').innerHTML = time;
}

function createLabel(name, position, scale, colour, fontSize, opacity) {

    var fontface = "Arial";
    var spacing = 10;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var metrics = context.measureText( name );
    var textWidth = metrics.width;

    canvas.width = textWidth + (spacing * 2);
    canvas.width *= 2;
    canvas.height = fontSize;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillStyle = "rgba(255, 255, 255, 0.0)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    var red = Math.round(colour[0]);
    var green = Math.round(colour[1]);
    var blue = Math.round(colour[2]);

    context.fillStyle = "rgba(" + red + "," + green + "," + blue + "," + "1.0)";
    context.font = fontSize + "px " + fontface;

    context.fillText(name, canvas.width/2, canvas.height/2);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    //texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial({
            //color: color,
            transparent: false,
            opacity: opacity,
            useScreenCoordinates: false,
            blending: THREE.AdditiveBlending,
            map: texture}
    );

    var sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(scale.x, scale.y, 1);
    sprite.position.set(position.x, position.y, position.z);

    return sprite;
}

$(document).ready(function() {
    //Initialise app
    var container = document.getElementById("WebGL-output");
    var app = new EnergyApp();
    app.init(container);
    app.createScene();
    app.createGUI();

    //GUI callbacks
    $("#chooseFile").on("change", function(evt) {
        app.onSelectFile(evt);
    });
    $("#locationBackward").on("click", function(evt) {
        app.showPreviousLocation();
    });
    $("#locationForward").on("click", function(evt) {
        app.showNextLocation();
    });
    $("#timeBackward").on("click", function(evt) {
        app.showPreviousTime();
    });
    $("#timeForward").on("click", function(evt) {
        app.showNextTime();
    });
    $("#dateBackward").on("click", function(evt) {
        app.showPreviousDay();
    });
    $("#dateForward").on("click", function(evt) {
        app.showNextDay();
    });
    $(document).keydown(function (event) {
        app.onKeyDown(event);
    });
    app.run();
});
