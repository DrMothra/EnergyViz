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

function getHoursFromStart(date, hour) {
    return (date-1)*24 + hour;
}

function daysPerMonth(month) {
    return daysMonth[month];
}

function constructDate(day, date, month, hour) {
    //Construct date in required format
    return day+' '+date+' '+month+' 2014 - '+hour+':00 - '+hour+':59';
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
    this.allDataLoaded = false;
    this.updateRequired = false;
    this.guiControls = null;
    this.screenGeometry = null;
    this.personGeom = null;
    this.dataFile = null;
    this.filename = '';
    this.objectsRendered = 0;
    this.showData = false;
    //Animation
    this.totalDelta = 0;
    this.startRot = 0;
    this.startPos = 0;
    this.rotInc = Math.PI/180 * 72;
    this.posInc = 10;
    this.animate = false;
    this.animating = false;
    this.animationTime = 2;
    this.animationGroup = null;
};

EnergyApp.prototype.update = function() {
    //Perform any updates
    if(!this.allDataLoaded) {
        if(this.personGeom && this.screenGeometry && this.data) {
            this.generateGUIControls();
            this.generateData();
            this.updateRequired = true;
            this.allDataLoaded = true;
        }
    }
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
        this.animationGroup.position.y -= (delta/this.animationTime) * this.posInc;
        this.totalDelta += delta;
        if(this.totalDelta >= this.animationTime) {
            this.animating = false;
            this.totalDelta = 0;
            this.root.rotation.y = this.startRot + this.rotInc;
            this.animationGroup.position.y = this.startPos - this.posInc;
            hideGroup(this.animationGroup);
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

    //Load json data
    var _this = this;
    var dataLoad = new dataLoader();
    var dataParser = function(data) {
        _this.data = data;
        if(_this.personGeom && _this.screenGeometry) {
            _this.generateGUIControls();
            _this.generateData();
            _this.updateRequired = true;
        }
    };

    dataLoad.load("data/energy.json", dataParser);
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
    var startPos = new THREE.Vector3(-22.5, -56, 0);
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
    //Screen 2
    occupancyScale = new THREE.Vector3(1, 1, 1);
    occupancyPerRow = 20;
    startPos = new THREE.Vector3(-45, -56, 0);
    occupancyGroup = {'occupancyScale' : occupancyScale, 'occupancyPerRow' : occupancyPerRow, 'startPos' : startPos, 'increments' : increments};
    occupancies.push(occupancyGroup);
    //Screen 3
    occupancyScale = new THREE.Vector3(1, 1, 1);
    occupancyPerRow = 20;
    startPos = new THREE.Vector3(-45, -56, 0);
    occupancyGroup = {'occupancyScale' : occupancyScale, 'occupancyPerRow' : occupancyPerRow, 'startPos' : startPos, 'increments' : increments};
    occupancies.push(occupancyGroup);
    //Screen 4
    occupancyScale = new THREE.Vector3(1, 1, 1);
    occupancyPerRow = 15;
    startPos = new THREE.Vector3(-35, -56, 0);
    occupancyGroup = {'occupancyScale' : occupancyScale, 'occupancyPerRow' : occupancyPerRow, 'startPos' : startPos, 'increments' : increments};
    occupancies.push(occupancyGroup);

    var dataTexture = THREE.ImageUtils.loadTexture("images/noData.png");
    var emptyMaterial = new THREE.MeshLambertMaterial({color : 0xffffff});
    var dataMaterial = new THREE.MeshLambertMaterial({map : dataTexture, transparent : true});
    for(var i=0; i<this.locationNames.length; ++i) {
        var group = new THREE.Object3D();
        group.name = this.locationNames[i];
        group.position.set(xPos[i], 0, zPos[i]);
        group.position.multiplyScalar(scalingFactor);
        this.screenGroups.push(group);
        var occupancy = new THREE.Object3D();
        occupancy.name = 'Occupancy' + group.name;
        occupancy.properties = occupancies[i];
        //Add geometry to group
        //Get group properties
        var props = occupancies[i];
        var startPos = props['startPos'];
        var scale = props['occupancyScale'];
        var xInc = props['increments'].x;
        var zInc = props['increments'].z;
        var occPerRow = props['occupancyPerRow'];
        var maxOccupancy = this.maxOccupancy[i];
        for(var j=0; j<maxOccupancy; ++j) {
            var person = new THREE.Mesh(this.personGeom, emptyMaterial);
            person.visible = false;
            person.scale.set(scale.x, scale.y, scale.z);
            person.position.x = startPos.x + (j%occPerRow * xInc);
            person.position.y = startPos.y;
            person.position.z = startPos.z + (parseInt(j/occPerRow)*zInc);
            occupancy.add(person);
        }
        //Add indication for no data available
        var unknownGeom = new THREE.PlaneGeometry(10, 10);
        var unknown = new THREE.Mesh(unknownGeom, dataMaterial);
        unknown.name = 'noData';
        unknown.position.set(0, -55, 0);
        unknown.visible = false;
        occupancy.add(unknown);
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

    //Add line graph data
    var lineData12 = {"Domain": "(null)", "Reference": "(null)", "Version": "(null)", "ts": "2014-06", "Log Program Version": "2", "Coverage": "(null)", "reading units": "kW",
        "data": {"start": 1401577200000, "step": 3600000, "readings": [
        0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0331, 0.0329, 0.0329, 0.0330, 0.0329, 0.0331, 0.0330, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329,
        0.0330, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0330, 0.0330, 0.0329, 0.0332, 0.0330, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0330, 0.0330, 0.0329, 0.0329,
        0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0000, 0.8711, 1.1362, 1.1589, 1.2478, 1.7158, 2.1584, 2.2554, 2.3640, 2.2141, 2.2250,
        2.1545, 1.1378, 0.3860, 0.3771, 0.3744, 0.4372, 0.3749, 1.8901, 1.0776, 0.4536, 0.3881, 0.3899, 0.4645, 0.3932, 0.4158, 0.4377, 0.5163, 0.4288, 0.4958, 0.7344, 2.3490, 2.2085, 2.0516,
        2.2232, 2.1828, 1.1408, 0.7368, 0.6475, 0.6479, 0.7155, 0.6515, 2.4879, 2.7762, 1.1129, 0.3949, 0.6432, 1.6976, 2.1596, 2.1476, 1.8797, 2.1867, 2.1653, 1.7253, 1.7613, 1.9513, 2.0614,
        2.0489, 2.1170, 2.0936, 0.6406, 0.4712, 0.3911, 0.3904, 0.3876, 0.7043, 2.5218, 2.8371, 2.5790, 2.5262, 1.0964, 1.6412, 2.0258, 1.9027, 1.9126, 1.9263, 1.9027, 2.2263, 2.1743, 2.0768,
        2.1444, 1.9689, 2.1371, 2.1816, 1.4244, 0.5518, 0.4155, 0.4593, 0.3891, 0.3888, 0.8134, 0.4656, 0.3976, 0.3933, 0.4190, 0.4849, 0.4304, 0.4358, 1.4951, 2.1280, 2.1574, 2.0877, 1.9540,
        2.3769, 2.2760, 2.3386, 2.2760, 2.3076, 1.2891, 0.3751, 0.3458, 0.3964, 0.3236, 0.3253, 0.3977, 0.3376, 0.3785, 1.6931, 0.4294, 0.4063, 0.3606, 1.5392, 2.1607, 2.1394, 1.7724, 2.2001,
        2.2581, 1.9968, 2.1858, 2.0120, 2.2365, 2.1400, 0.5120, 0.3368, 0.3987, 0.3233, 0.3258, 0.3236, 2.3807, 2.7362, 1.0303, 0.3346, 0.4104, 1.3495, 1.4307, 1.3636, 1.2244, 1.1949, 1.2497,
        1.1984, 1.2344, 2.1114, 2.2519, 2.0986, 2.2903, 2.1407, 0.6691, 0.3518, 0.4048, 0.3367, 0.3418, 0.3414, 2.1080, 1.1046, 0.3681, 0.4140, 0.4125, 0.3949, 0.3839, 0.4610, 0.4089, 0.4539,
        0.4371, 0.5539, 0.8939, 2.0585, 2.1617, 2.1827, 2.2715, 2.2351, 0.6489, 0.4668, 0.3855, 0.3879, 0.3885, 0.4497, 2.5255, 3.1502, 2.5336, 2.5994, 2.5236, 2.6793, 2.7687, 2.7118, 2.3138,
        1.6330, 0.6998, 0.6096, 0.6962, 2.0262, 2.3341, 2.1656, 2.2563, 2.2236, 0.6263, 0.3815, 0.3670, 0.4337, 0.3653, 0.3671, 2.3796, 2.9905, 0.8920, 0.3744, 0.6546, 1.7923, 2.2390, 2.1567,
        1.9469, 2.2097, 2.1531, 2.1481, 2.2534, 2.2205, 2.4569, 2.4377, 2.3176, 2.9583, 0.8349, 0.4439, 0.4917, 0.4318, 0.4258, 0.4221, 0.6607, 2.3115, 0.4398, 0.5203, 0.4610, 0.4522, 0.6811,
        1.7980, 1.2668, 1.1961, 1.6077, 2.1651, 2.2652, 2.1506, 2.2442, 2.1509, 2.2345, 2.2478, 1.8025, 0.5443, 0.4471, 0.3878, 0.3827, 0.3808, 1.2784, 2.6011, 0.3955, 0.4733, 0.4013, 0.3989,
        0.4152, 1.2366, 2.0034, 2.1759, 2.0914, 2.2522, 2.1968, 2.1530, 2.2092, 2.1523, 2.2242, 2.2244, 1.2789, 0.5144, 0.4323, 0.3784, 0.3709, 0.4308, 0.3691, 1.8126, 2.5728, 1.9389, 0.3844,
        0.4156, 1.4980, 2.5162, 2.0488, 2.2455, 2.1235, 2.0922, 2.0814, 1.9812, 2.0693, 1.9733, 2.1310, 2.0202, 0.3702, 0.4249, 0.3331, 0.3387, 0.3362, 0.4022, 1.8302, 2.4713, 2.3345, 0.3416,
        0.3496, 0.3771, 0.4589, 0.5312, 0.4010, 0.3979, 0.4962, 0.4155, 1.5216, 1.9821, 2.0534, 1.9190, 2.1304, 2.0550, 0.4164, 0.3163, 0.3769, 0.3084, 0.3057, 0.5550, 2.4502, 2.4344, 2.4711,
        0.5864, 0.4145, 1.4346, 1.2206, 1.1641, 1.1854, 1.4302, 1.2650, 1.2106, 1.2362, 2.1072, 2.2292, 2.2540, 2.2515, 2.1413, 1.3779, 0.4351, 0.4848, 0.4126, 0.4116, 0.4636, 1.6039, 1.4586,
        0.5151, 0.5575, 0.4864, 0.4646, 0.5820, 0.8007, 1.8417, 1.4448, 1.5149, 1.2614, 1.8813, 2.2308, 2.6529, 2.4137, 2.4789, 2.2823, 0.6035, 0.4617, 0.4325, 0.4326, 0.4931, 0.4317, 0.4336,
        2.1626, 1.8980, 1.8497, 1.7214, 1.6133, 2.1586, 2.2054, 1.9398, 2.2304, 2.2965, 2.6892, 2.2029, 2.0947, 2.2010, 2.0594, 2.3072, 2.1845, 0.5890, 0.4325, 0.4460, 0.4177, 0.3974, 0.4531,
        0.6780, 2.0238, 2.1381, 1.8534, 0.5632, 0.4078, 0.4120, 1.7258, 1.8074, 1.8381, 1.8144, 2.2601, 2.1632, 2.2293, 2.1325, 2.2701, 2.2375, 2.0343, 1.2607, 0.4718, 0.3699, 0.3641, 0.4189,
        0.3577, 0.3613, 1.8091, 1.9700, 0.8148, 0.3806, 0.3937, 0.4502, 0.4435, 1.8289, 2.2139, 2.2094, 2.0012, 2.3237, 2.2432, 2.1402, 2.2650, 2.2590, 1.9532, 0.4057, 0.3903, 0.4240, 0.3505,
        0.3455, 0.3512, 0.4205, 0.4744, 1.9236, 1.7480, 0.8956, 0.4032, 1.3708, 1.6185, 1.7084, 2.0608, 2.0379, 1.8641, 2.0441, 2.0601, 1.9463, 1.9910, 2.0952, 1.8279, 0.4444, 0.3686, 0.4114,
        0.3473, 0.3465, 0.4103, 0.5952, 1.7442, 1.7580, 0.7909, 0.3648, 0.3750, 0.3715, 0.4907, 0.3882, 1.5200, 1.8699, 1.0659, 1.8955, 1.9042, 1.7786, 1.8644, 1.9100, 1.7525, 0.8809, 0.1952,
        0.2233, 0.1622, 0.1771, 0.1529, 0.4657, 1.5508, 1.7401, 1.0457, 0.1873, 0.1851, 0.1974, 0.1832, 0.3150, 1.5740, 1.5926, 1.6737, 2.1082, 1.9096, 1.8227, 2.0389, 1.9729, 1.7401, 0.2330,
        0.2852, 0.1774, 0.1736, 0.2419, 0.1771, 0.1714, 1.7455, 1.6322, 1.2437, 0.1885, 0.2292, 1.6299, 1.7185, 0.6838, 1.2500, 1.5903, 1.1192, 2.1285, 1.9945, 1.9752, 1.9654, 2.0310, 1.8465,
        0.9697, 0.2221, 0.1834, 0.2534, 0.1888, 0.1737, 0.4909, 1.7179, 1.5611, 1.0622, 0.3301, 1.7428, 1.9335, 2.0209, 1.7564, 1.9371, 1.9730, 1.9974, 1.9560, 1.4894, 1.7465, 1.8917, 0.9000,
        0.2628, 0.1993, 0.1806, 0.2221, 0.1645, 0.1647, 0.1615, 0.6509, 2.0172, 1.5524, 1.5391, 0.5975, 0.2607, 0.9933, 0.7735, 0.7247, 0.9387, 1.9662, 1.8702, 1.6568, 1.9115, 1.9124, 1.7146,
        1.9018, 1.8511, 1.1599, 0.2191, 0.1763, 0.2352, 0.1772, 0.1766, 1.4378, 2.3370, 2.2807, 0.9947, 0.2625, 0.1930, 0.2172, 1.3142, 1.9635, 1.8081, 1.8226, 2.0163, 1.8646, 2.0136, 1.9684,
        1.9219, 1.9759, 1.9790, 1.2109, 0.3078, 0.1909, 0.1797, 0.2354, 0.1657, 0.1688, 1.3279, 0.1916, 0.1830, 0.2584, 0.2189, 0.6278, 1.7368, 1.9788, 1.8260, 2.0112, 2.1872, 1.9257, 2.1440,
        2.1716, 1.7669, 1.9412, 1.9599, 1.0416, 0.2586, 0.2901, 0.2306, 0.2324, 0.2345, 2.3392, 2.3216, 2.9079, 0.4151, 0.2621, 0.2638, 0.2604, 0.4323, 0.4843, 0.4805, 0.4940, 1.2494, 1.5038,
        1.9453, 2.0095, 1.8280, 1.9246, 1.9482, 0.3303, 0.1930]}};

    var lineData11 = {"Domain": "(null)", "Reference": "(null)", "Version": "(null)", "ts": "2014-06", "Log Program Version": "2", "Coverage": "(null)", "reading units": "kW",
        "data": {"start": 1401577200000, "step": 3600000, "readings": [
        0.0342, 0.0345, 0.0331, 0.0329, 0.0329, 0.0331, 0.0329, 0.0336, 0.0361, 0.0363, 0.0356, 0.0336, 0.0330, 0.0331, 0.0330, 0.0330, 0.0331, 0.0329, 0.0329, 0.0329, 0.0329, 0.0330, 0.0329,
        0.0331, 0.0329, 0.0329, 0.0329, 0.0329, 0.0331, 0.0334, 0.0334, 0.0335, 0.0331, 0.0330, 0.0334, 0.0334, 0.0331, 0.0329, 0.0333, 0.0336, 0.0329, 0.0329, 0.0330, 0.0329, 0.0329, 0.0329,
        0.0329, 0.0329, 0.0331, 0.0334, 0.0330, 0.0329, 0.0332, 0.0342, 0.0330, 0.0329, 0.0331, 0.0333, 0.0000, 0.7633, 1.2714, 1.1198, 1.1218, 1.3730, 2.0717, 1.8783, 2.0044, 2.0666, 2.0172,
        2.0183, 1.0924, 0.5128, 0.5131, 0.5080, 0.5074, 0.5023, 0.9150, 0.7092, 0.5304, 0.5165, 0.5203, 0.5472, 0.5255, 0.5506, 0.5580, 0.5462, 0.5592, 0.5444, 0.6487, 1.7026, 2.0146, 1.7868,
        2.0417, 2.0837, 1.4409, 1.2257, 1.1119, 1.1163, 1.1286, 1.1333, 1.1504, 1.1243, 0.6863, 0.5052, 0.5249, 0.9712, 2.0175, 2.0217, 1.1876, 1.9820, 2.0269, 1.1469, 1.1388, 1.6715, 2.0298,
        1.7220, 2.0412, 2.0490, 0.6670, 0.5204, 0.5015, 0.5047, 0.5044, 0.5912, 1.1409, 1.1270, 1.1230, 1.1168, 0.7345, 0.7674, 0.8372, 0.8703, 0.8236, 0.8855, 0.9368, 2.1137, 2.1187, 1.7879,
        2.1248, 1.7439, 2.0918, 2.1035, 1.2249, 0.6399, 0.5556, 0.5141, 0.5100, 0.5048, 0.6414, 0.5222, 0.5166, 0.5077, 0.5453, 0.5423, 0.5519, 0.5618, 1.0312, 1.7381, 2.0526, 1.8430, 1.5401,
        2.2890, 2.1608, 2.2372, 2.0623, 2.1162, 1.2724, 0.5647, 0.5414, 0.5177, 0.5088, 0.5129, 0.5262, 0.5252, 0.5313, 0.8746, 0.5382, 0.5454, 0.5481, 1.3574, 2.0833, 2.0185, 1.2048, 2.1618,
        2.1587, 1.7535, 2.1321, 1.7178, 2.1049, 2.0564, 0.6589, 0.5169, 0.5125, 0.5090, 0.5129, 0.5075, 1.0860, 1.1260, 0.6461, 0.5236, 0.5312, 1.2278, 1.3570, 1.2839, 1.1275, 1.1119, 1.1378,
        1.1722, 1.1431, 1.6779, 2.0791, 1.7474, 2.0511, 2.0458, 0.7507, 0.5132, 0.5075, 0.5076, 0.5169, 0.5183, 0.9902, 0.7603, 0.5650, 0.5440, 0.6454, 0.6007, 0.6014, 0.6228, 0.6109, 0.6018,
        0.6224, 0.6533, 0.8250, 1.7410, 2.0584, 1.7470, 2.0441, 2.0173, 0.6560, 0.4912, 0.4791, 0.4825, 0.4854, 0.4802, 1.0501, 1.0683, 1.0659, 1.0808, 1.0776, 1.4428, 1.9938, 2.0703, 1.7266,
        1.0506, 0.6228, 0.5356, 0.5300, 1.5375, 2.0358, 1.7042, 1.9854, 1.9873, 0.8299, 0.7057, 0.7024, 0.7073, 0.7024, 0.6969, 1.0354, 1.0665, 0.6226, 0.4734, 0.6234, 1.1284, 1.9745, 1.8179,
        1.1589, 1.9622, 1.8634, 1.8255, 1.9994, 1.7280, 2.0905, 2.1542, 2.0453, 2.0479, 0.7284, 0.5044, 0.4869, 0.4740, 0.4758, 0.4769, 0.5563, 1.0337, 0.5026, 0.5125, 0.5394, 0.5051, 0.5531,
        1.6408, 1.0412, 1.0414, 1.1553, 1.9888, 2.0265, 1.7084, 2.0727, 1.7598, 2.0811, 2.0487, 1.1361, 0.5722, 0.4823, 0.4920, 0.4869, 0.4857, 0.6841, 1.0771, 0.5037, 0.5091, 0.4973, 0.4907,
        0.5276, 0.8663, 1.6473, 2.0803, 1.7539, 2.1116, 2.1094, 1.8248, 2.1046, 1.7192, 2.1151, 2.0976, 1.1223, 0.6202, 0.5946, 0.4964, 0.4856, 0.4832, 0.4907, 0.9291, 1.1432, 0.9456, 0.5002,
        0.5498, 1.2626, 1.9969, 1.7109, 2.1260, 1.8152, 2.0843, 2.0931, 1.7164, 2.0862, 1.7251, 2.0698, 1.9957, 0.5372, 0.5161, 0.4792, 0.4903, 0.4795, 0.4850, 0.9139, 1.1165, 0.8699, 0.4870,
        0.5043, 0.5403, 0.5689, 0.5660, 0.5693, 0.5619, 0.6212, 0.5984, 1.0383, 1.6481, 2.0745, 1.6459, 2.0444, 2.0050, 0.5223, 0.4727, 0.4765, 0.4748, 0.4701, 0.5286, 1.0825, 1.0911, 1.1228,
        0.5396, 0.6080, 1.2224, 1.0970, 1.1322, 1.1276, 1.3504, 1.1622, 1.1373, 1.1578, 1.6271, 1.9837, 2.0700, 2.1610, 1.8317, 0.9533, 0.4791, 0.4783, 0.4797, 0.4813, 0.4765, 0.8190, 0.7801,
        0.6535, 0.6064, 0.5917, 0.5463, 0.5528, 0.6970, 1.5058, 0.9797, 1.3192, 1.1339, 1.7630, 1.9825, 2.2228, 2.1435, 2.2254, 2.0222, 0.5932, 0.5241, 0.4851, 0.4890, 0.4732, 0.4723, 0.4774,
        1.0781, 1.1187, 1.1183, 1.0928, 1.2114, 1.9483, 2.1199, 1.3796, 1.9784, 2.1505, 2.0796, 1.7855, 1.7017, 2.0679, 1.7035, 2.0918, 2.0481, 0.6296, 0.5005, 0.4677, 0.4789, 0.4677, 0.4736,
        0.6010, 1.1122, 1.0995, 1.0934, 0.5561, 0.5015, 0.5093, 1.0491, 1.1264, 1.1244, 1.1338, 1.7472, 1.9006, 2.0952, 1.8448, 1.9033, 2.0462, 1.8229, 1.0858, 0.5052, 0.4482, 0.4422, 0.4314,
        0.4401, 0.4464, 1.0522, 1.0598, 0.6405, 0.4642, 0.4801, 0.4578, 0.4940, 1.1690, 2.0341, 2.0748, 1.5843, 2.0002, 2.0848, 1.8366, 1.9883, 1.9984, 1.7456, 0.5048, 0.4958, 0.4583, 0.4418,
        0.4315, 0.4470, 0.4572, 0.4896, 1.0690, 1.0628, 0.6737, 0.4590, 0.6385, 1.0409, 1.1048, 2.0292, 2.0164, 1.5847, 1.8648, 2.0536, 1.7883, 1.8351, 1.9864, 1.6687, 0.5058, 0.4568, 0.4320,
        0.4395, 0.4390, 0.4415, 0.5485, 1.0556, 1.0924, 0.6183, 0.4572, 0.4706, 0.4620, 0.5401, 0.4939, 0.6047, 1.8168, 1.0963, 1.8581, 2.0457, 1.7812, 1.8198, 1.9741, 1.7764, 0.9455, 0.4680,
        0.4339, 0.4331, 0.4564, 0.4264, 0.5511, 1.0837, 1.0719, 0.8003, 0.4755, 0.4713, 0.4835, 0.4604, 0.5191, 1.2226, 1.7929, 1.7668, 2.0681, 1.9848, 1.7819, 1.9177, 2.0473, 1.7679, 0.5003,
        0.4994, 0.4489, 0.4430, 0.4543, 0.4517, 0.4469, 1.0854, 1.0795, 0.9234, 0.4573, 0.4584, 1.0308, 0.9087, 0.4809, 1.0357, 1.3010, 0.8792, 2.0591, 2.0433, 1.8246, 1.8580, 2.0305, 1.8147,
        1.0030, 0.4800, 0.4463, 0.4629, 0.4548, 0.4355, 0.5767, 1.0643, 1.0852, 0.8298, 0.5319, 1.4226, 1.9930, 2.0498, 1.3625, 1.7744, 2.0846, 1.9384, 2.0543, 1.1485, 1.6742, 2.0275, 1.0733,
        0.4803, 0.4701, 0.4453, 0.4244, 0.4345, 0.4352, 0.4300, 0.6279, 1.0643, 1.0981, 1.0622, 0.6052, 0.4680, 0.7918, 0.4074, 0.4368, 0.5985, 1.7631, 1.9783, 1.5036, 1.9831, 1.9699, 1.5138,
        1.9960, 1.9667, 1.0847, 0.4721, 0.4368, 0.4268, 0.4339, 0.4445, 0.7577, 1.0583, 1.0723, 0.6700, 0.4699, 0.4480, 0.4758, 1.3844, 1.9682, 1.7472, 1.7637, 2.0045, 1.6182, 2.0252, 1.9967,
        1.6673, 1.9915, 1.9963, 1.1233, 0.7644, 0.6909, 0.6670, 0.6553, 0.6539, 0.6556, 0.8574, 0.4590, 0.4405, 0.4589, 0.4809, 0.6321, 1.5388, 1.9768, 1.7816, 1.7857, 2.0059, 1.5236, 2.0522,
        2.0563, 1.5572, 1.9859, 1.9044, 0.9936, 0.4570, 0.4385, 0.4408, 0.4481, 0.4515, 1.0683, 1.0898, 1.0623, 0.4760, 0.4991, 0.5349, 0.4943, 0.5145, 0.5440, 0.5478, 0.5534, 0.6637, 1.2418,
        2.0422, 2.0414, 1.6568, 2.0455, 1.9477, 0.6655, 0.6254]}};

    var lineData10 = {"Domain": "(null)", "Reference": "(null)", "Version": "(null)", "ts": "2014-06", "Log Program Version": "2", "Coverage": "(null)", "reading units": "kW",
        "data": {"start": 1401577200000, "step": 3600000, "readings": [
        0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0330, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329,
        0.0330, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0330, 0.0329, 0.0329, 0.0330, 0.0329, 0.0330, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0330, 0.0329, 0.0329, 0.0329,
        0.0330, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0329, 0.0000, 1.8175, 1.6832, 1.7180, 1.9453, 1.9326, 2.5328, 2.5867, 3.2884, 2.8516, 3.2177,
        2.6183, 1.6584, 0.8869, 1.0659, 0.8900, 0.8906, 0.8914, 1.2025, 1.3999, 0.9323, 0.9180, 0.9109, 1.1583, 1.3118, 0.9903, 1.0708, 1.0512, 1.0680, 1.2031, 1.1361, 2.1405, 2.5842, 2.3508,
        2.7996, 2.6383, 1.6303, 1.3429, 1.2306, 1.4604, 1.2395, 1.2419, 1.3707, 1.3544, 0.9588, 1.0120, 0.8737, 1.4995, 2.7936, 2.7677, 2.3978, 2.7268, 2.7176, 2.2316, 1.7530, 2.4442, 2.6046,
        2.3295, 2.8639, 2.6777, 1.0049, 0.8005, 0.7970, 0.9917, 0.6351, 0.3142, 0.8456, 0.9154, 1.0125, 1.2653, 1.1814, 1.1132, 1.1926, 1.3505, 1.4015, 1.2398, 1.3796, 2.5861, 2.6062, 2.5566,
        2.6427, 2.3115, 2.8258, 2.6451, 1.3662, 1.1638, 0.9330, 0.7992, 0.9870, 0.7948, 0.9812, 0.8947, 0.8782, 1.0596, 0.9467, 0.9001, 0.9071, 0.9202, 1.8373, 2.5832, 2.6377, 2.6820, 2.3657,
        4.0171, 3.1805, 3.3581, 2.9286, 2.9255, 1.9978, 0.9184, 0.8290, 1.0087, 0.7966, 0.8033, 0.8228, 0.8189, 0.8219, 1.3248, 0.8184, 0.8244, 0.8198, 1.9379, 2.8222, 2.5996, 1.8402, 2.7010,
        2.9155, 2.3370, 2.7117, 2.3426, 2.7051, 2.6689, 1.2165, 0.8153, 0.8088, 0.8084, 0.8011, 0.7420, 1.2288, 1.2549, 1.1987, 0.8454, 0.8408, 1.6983, 1.9221, 2.0747, 1.7444, 1.7459, 1.7806,
        1.7954, 2.0104, 2.1225, 2.4566, 2.1822, 2.7122, 2.4777, 1.3241, 0.8955, 0.8927, 1.1143, 0.8998, 0.9038, 1.1838, 1.0753, 1.2327, 0.9525, 1.0209, 0.9913, 0.9773, 1.2133, 0.9836, 0.8566,
        0.8542, 0.9215, 1.5375, 2.1795, 2.4952, 2.4407, 2.6467, 2.6261, 0.9503, 0.7450, 0.9259, 0.7435, 0.7538, 0.7475, 1.2500, 1.5511, 1.2570, 1.2699, 1.2622, 1.7799, 2.6435, 2.6506, 2.2021,
        1.5213, 1.1021, 0.7809, 0.8168, 2.0483, 2.7501, 2.2190, 2.4984, 2.4758, 0.9741, 0.9994, 0.8056, 0.8201, 0.8153, 0.8094, 1.2297, 1.4600, 1.0017, 0.9008, 1.0623, 1.9361, 2.3997, 2.4653,
        2.0747, 3.0436, 2.9641, 3.0683, 2.6064, 2.4590, 3.2845, 3.4042, 2.5284, 2.6817, 0.9992, 0.7506, 0.8916, 0.7211, 0.7268, 0.7325, 0.8033, 1.2498, 0.8511, 0.8635, 0.8491, 1.0187, 0.9965,
        2.1071, 1.5902, 1.6653, 1.8020, 2.3978, 2.5652, 2.2489, 2.7384, 2.2385, 2.5417, 2.6656, 1.2915, 0.8638, 0.9672, 0.7441, 0.7411, 0.7394, 0.9052, 1.4487, 0.8522, 0.8496, 0.8372, 0.8245,
        0.8684, 1.5343, 2.1008, 2.4879, 2.1853, 2.7103, 2.8178, 2.4346, 2.5438, 2.4980, 2.7519, 2.5538, 1.4203, 0.9503, 1.1034, 0.7799, 0.9207, 0.7429, 0.9218, 1.1190, 1.4790, 1.1160, 0.7630,
        0.9957, 1.6544, 2.6077, 2.3711, 2.7643, 2.4705, 2.5181, 2.8101, 2.3883, 2.5021, 2.3734, 2.5285, 2.4385, 0.8793, 1.0131, 0.7532, 0.7632, 0.7590, 0.7539, 1.0978, 1.4393, 1.0898, 0.8427,
        0.8461, 0.8783, 0.8945, 1.0974, 0.8935, 0.8947, 1.2146, 0.9346, 1.4107, 2.0833, 2.4795, 2.3057, 2.4754, 2.4217, 0.7913, 0.9520, 0.7413, 0.7358, 0.7381, 0.7863, 1.2279, 1.2295, 1.4905,
        0.8813, 0.9155, 1.4836, 1.5588, 1.8896, 1.7385, 2.0425, 1.6267, 1.6018, 1.8447, 2.0427, 2.3812, 2.6764, 2.8431, 2.2004, 1.3191, 0.7340, 0.7362, 0.7405, 0.9741, 0.7311, 1.0065, 0.9777,
        0.9145, 0.8701, 1.1094, 0.8598, 0.8425, 1.1310, 2.0233, 1.5628, 1.9301, 1.6442, 4.8522, 3.6943, 3.5293, 2.6586, 3.4348, 2.8208, 0.9710, 1.0192, 0.8263, 0.8389, 0.8171, 1.0329, 0.8165,
        1.2289, 1.2559, 1.2465, 1.4451, 1.8897, 2.3967, 2.7298, 2.8929, 2.7303, 2.9790, 2.7712, 2.5236, 2.1219, 2.4659, 2.1446, 2.7215, 2.4808, 1.1078, 0.8035, 0.7272, 0.7397, 0.7274, 0.7318,
        0.8378, 1.4776, 1.2401, 1.2361, 0.7890, 0.9899, 0.8507, 1.4789, 1.2035, 1.4491, 1.4668, 2.2260, 2.5705, 2.5325, 2.3405, 2.5172, 2.6994, 2.2483, 1.1955, 0.8083, 0.7552, 0.9568, 0.7379,
        0.7492, 0.7630, 1.2695, 1.2757, 1.2015, 0.8723, 0.8808, 0.8485, 0.8858, 1.9302, 2.5123, 2.5877, 2.3145, 2.4829, 2.9179, 2.3593, 2.7505, 2.5082, 2.4853, 0.8826, 0.8839, 0.8395, 1.0475,
        0.8088, 0.8246, 0.8448, 0.8611, 1.2859, 1.2862, 1.3129, 0.9812, 1.6378, 2.0244, 2.0929, 2.5986, 2.5477, 2.3477, 2.3667, 2.5799, 2.3141, 2.3840, 2.7599, 2.2256, 0.8452, 0.7649, 0.7390,
        0.9760, 0.7462, 0.7517, 0.8503, 1.2804, 1.3169, 1.1850, 0.8461, 0.8607, 0.8635, 0.9348, 1.2711, 1.1893, 2.2299, 1.8083, 2.7193, 2.6553, 2.6606, 2.4972, 2.6470, 2.5978, 1.2366, 0.9711,
        0.9411, 0.9387, 1.2035, 0.9350, 1.0298, 1.4241, 1.6534, 1.2232, 1.0138, 1.2708, 1.0159, 1.0057, 1.2499, 1.6381, 2.8672, 2.4617, 2.6391, 2.6030, 2.7798, 2.5837, 2.9738, 2.4519, 1.0260,
        1.0479, 0.9786, 0.9720, 1.1796, 0.9874, 0.9828, 1.4473, 1.4260, 1.3367, 1.0955, 1.0877, 1.6183, 1.3456, 1.1268, 1.9242, 2.5308, 1.7325, 2.6736, 2.6838, 2.8065, 2.5444, 2.7195, 2.6550,
        1.2588, 0.9211, 1.0479, 0.8789, 0.8710, 0.8475, 0.9759, 1.6525, 1.4644, 1.2255, 0.9986, 2.3641, 2.5735, 2.9451, 3.1356, 2.6689, 2.7130, 3.0616, 2.7010, 2.0910, 2.6061, 2.7557, 1.8049,
        0.8981, 0.8867, 0.8650, 1.0275, 0.8570, 0.8595, 0.8564, 1.0383, 1.4512, 1.4792, 1.4424, 1.2650, 0.9916, 1.6103, 1.3407, 1.3653, 1.4892, 2.4289, 2.9031, 2.2172, 2.6855, 2.6705, 2.2600,
        2.7236, 2.8601, 1.3472, 0.8895, 1.0426, 0.8455, 0.8516, 0.8619, 1.1653, 1.7451, 1.6250, 1.1452, 1.0114, 0.9807, 1.0112, 2.0845, 2.9530, 2.4836, 2.4901, 2.7061, 2.3415, 2.9138, 2.7028,
        2.3641, 2.9385, 2.6993, 1.7476, 0.9588, 0.8884, 0.8660, 1.2354, 0.8564, 0.8562, 1.1490, 0.8929, 0.8751, 0.8853, 1.1783, 1.2538, 2.2898, 2.7248, 2.5214, 2.7655, 2.7376, 2.2560, 2.7497,
        2.7815, 2.5296, 2.7263, 2.6400, 1.6215, 0.8808, 0.8608, 0.8626, 0.8680, 1.1065, 1.4559, 1.4684, 1.4444, 1.0097, 1.4933, 1.5541, 1.3442, 1.2280, 1.5366, 1.3556, 1.3614, 1.5895, 1.6914,
        2.7512, 2.9431, 2.3986, 2.7521, 2.6808, 1.2060, 0.9171]}};

    //Group to hold all line data
    var lineDataGroup = new THREE.Object3D();
    lineDataGroup.name = 'lineDataGroup';
    lineDataGroup.position.x = -139;
    lineDataGroup.position.y = -25;

    //Create line data
    var powerData = [];
    powerData.push(lineData10);
    powerData.push(lineData11);
    powerData.push(lineData12);

    var scaleFactor = 10;
    var colours = [0xFF3FA7, 0x00ff00, 0x2372FF];
    for(var i=0; i<powerData.length; ++i) {
        var numPoints = powerData[i].data.readings.length;
        var geometry = new THREE.BufferGeometry();
        var material = new THREE.LineBasicMaterial({ color : colours[i] });
        var positions = new Float32Array( numPoints * 3 );
        for ( var x = 0; x < numPoints; x ++ ) {
            // positions
            var dataPoint = powerData[i].data.readings[x];
            positions[ x * 3 ] = x;
            positions[ x * 3 + 1 ] = dataPoint*scaleFactor;
            positions[ x * 3 + 2 ] = 0;
        }
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.computeBoundingSphere();
        var lineMesh = new THREE.Line( geometry, material );
        lineMesh.name = 'phase'+i;
        lineMesh.position.y = i * 20;
        lineMesh.visible = this.showData;
        lineDataGroup.add(lineMesh);
    }

    this.scene.add(lineDataGroup);

    //Time line
    var timeGeom = new THREE.BufferGeometry();
    var timeMat = new THREE.LineBasicMaterial({ color : 0xFFffff});
    var scalePosition = new Float32Array(6);
    var scaleStart = new THREE.Vector3(0, -25, 0);
    var scaleEnd = new THREE.Vector3(0, 50, 0);
    scalePosition[0] = scaleStart.x;
    scalePosition[1] = scaleStart.y;
    scalePosition[2] = scaleStart.z;
    scalePosition[3] = scaleEnd.x;
    scalePosition[4] = scaleEnd.y;
    scalePosition[5] = scaleEnd.z;
    timeGeom.addAttribute('position', new THREE.BufferAttribute(scalePosition, 3));
    timeGeom.computeBoundingSphere();

    var timeLine = new THREE.Line(timeGeom, timeMat);
    timeLine.name = 'timeLine';
    timeLine.visible = this.showData;

    this.scene.add(timeLine);
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
    populateHall(this.screenGroups[this.currentLocation], this.personGeom, item['admits'], this.maxOccupancy[0]);
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
    this.animationGroup = getOccupancyGroup(this.screenGroups[this.currentLocation]);

    //Get data for previous location
    if(--this.currentLocation < 0) this.currentLocation = this.screenGroups.length-1;
    this.currentLocationName = this.locationNames[this.currentLocation];

    var screenGroup = this.screenGroups[this.currentLocation];
    var occGroup = getOccupancyGroup(screenGroup);

    console.log('Location =', this.currentLocationName);

    this.showData = false;
    if(this.currentLocationName.indexOf('Screen 1') >= 0) {
        this.showData = true;
    }
    this.showGraphData(this.showData);

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
                //Update information
                populateInfoPanel(item);
                //showGroup(occGroup);
                occGroup.position.set(0, 0, 0);
                populateHall(screenGroup, this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
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
    //Update information
    populateInfoPanel(data);
    //showGroup(occGroup);
    occGroup.position.set(0, 0, 0);
    populateHall(screenGroup, this.personGeom, -1, -1);
    //Animate occupancy group
    this.startPos = this.animationGroup.position.y;
};

EnergyApp.prototype.showNextLocation = function() {
    //Rotate screen structures
    this.startRot = this.root.rotation.y;
    if(this.rotInc > 0) this.rotInc *= -1;
    this.animating = true;
    this.animationGroup = getOccupancyGroup(this.screenGroups[this.currentLocation]);

    //Get data for next location
    if(++this.currentLocation >= this.screenGroups.length) this.currentLocation = 0;
    this.currentLocationName = this.locationNames[this.currentLocation];

    var screenGroup = this.screenGroups[this.currentLocation];
    var occGroup = getOccupancyGroup(screenGroup);
    console.log('Location =', this.currentLocationName);

    this.showData = false;
    if(this.currentLocationName.indexOf('Screen 1') >= 0) {
        this.showData = true;
    }
    this.showGraphData(this.showData);

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
                //Update info
                populateInfoPanel(item);
                occGroup.position.set(0, 0, 0);
                populateHall(screenGroup, this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
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
    //Update info
    populateInfoPanel(data);
    occGroup.position.set(0, 0, 0);
    populateHall(screenGroup, this.personGeom, -1, -1);
    //Animate occupancy group
    this.startPos = this.animationGroup.position.y;
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
    //Update info
    populateHall(this.screenGroups[this.currentLocation], this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);

    //Update timeline
    var hours = getHoursFromStart(this.date, this.hour);
    var timeLine = this.scene.getObjectByName('lineDataGroup');
    if(timeLine) {
        timeLine.position.x = -hours;
    }
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
    //Update info
    populateHall(this.screenGroups[this.currentLocation], this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);

    //Update timeline
    var hours = getHoursFromStart(this.date, this.hour);
    var timeLine = this.scene.getObjectByName('lineDataGroup');
    if(timeLine) {
        timeLine.position.x = -hours;
    }
};

EnergyApp.prototype.showPreviousDay = function() {
    //Construct previous day from current day
    if(this.date-1 < 1) return;

    var date = --this.date;
    var hour = this.hour;
    var month = this.month;
    var dayName = getPreviousDay(this.dayName);
    this.dayName = dayName;

    var eventDate = constructDate(dayName, date, month, hour);
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item['event_date'] == eventDate && item['hall_name'] == this.currentLocationName) {
            //Update info
            this.currentDataLocation = this.getLocation(item);
            populateInfoPanel(item);
            populateHall(this.screenGroups[this.currentLocation], this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
            //Update timeline
            var hours = getHoursFromStart(this.date, this.hour);
            var timeLine = this.scene.getObjectByName('lineDataGroup');
            if(timeLine) {
                timeLine.position.x = -hours;
            }
            return;
        }
    }
    //Not exact match
    var data = jQuery.extend({}, this.data[this.currentDataLocation]);
    data['event_date'] = eventDate;
    data['admits'] = -1;
    data['occupancy'] = -1;
    //Update info
    populateInfoPanel(data);
    populateHall(this.screenGroups[this.currentLocation], this.personGeom, -1, -1);
    //Update timeline
    var hours = getHoursFromStart(this.date, this.hour);
    var timeLine = this.scene.getObjectByName('lineDataGroup');
    if(timeLine) {
        timeLine.position.x = -hours;
    }
};

EnergyApp.prototype.showNextDay = function() {
    //Construct next day from current day
    if(this.date+1 > daysPerMonth(this.month)) return;

    var date = ++this.date;
    var dayName = getNextDay(this.dayName);
    this.dayName = dayName;
    var hour = this.hour;
    var month = this.month;

    var eventDate = constructDate(dayName, date, month, hour);
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item['event_date'] == eventDate && item['hall_name'] == this.currentLocationName) {
            //Update info
            this.currentDataLocation = this.getLocation(item);
            populateInfoPanel(item);
            populateHall(this.screenGroups[this.currentLocation], this.personGeom, item['admits'], this.maxOccupancy[this.currentLocation]);
            //Update timeline
            var hours = getHoursFromStart(this.date, this.hour);
            var timeLine = this.scene.getObjectByName('lineDataGroup');
            if(timeLine) {
                timeLine.position.x = -hours;
            }
            return;
        }
    }
    //Not exact match
    var data = jQuery.extend({}, this.data[this.currentDataLocation]);
    data['event_date'] = eventDate;
    data['admits'] = -1;
    data['occupancy'] = -1;
    //Update info
    populateInfoPanel(data);
    populateHall(this.screenGroups[this.currentLocation], this.personGeom, -1, -1);
    //Update timeline
    var hours = getHoursFromStart(this.date, this.hour);
    var timeLine = this.scene.getObjectByName('lineDataGroup');
    if(timeLine) {
        timeLine.position.x = -hours;
    }
};

EnergyApp.prototype.onPhaseSelect = function(name) {
    //Toggle graph data visibility

    var line = this.scene.getObjectByName(name, true);
    if(line) {
        line.visible = !line.visible;
    }
};

EnergyApp.prototype.showGraphData = function(show) {
    //Enable/Disable graph data
    var line = this.scene.getObjectByName('lineDataGroup', true);
    if(line) {
        line.traverse(function(obj) {
            if(obj instanceof THREE.Line) {
                var checkbox = $('#'+obj.name);
                obj.visible = show ? checkbox[0].checked : false;
            }
        });
    }
    line = this.scene.getObjectByName('timeLine', true);
    if(line) {
        line.visible = this.showData;
    }
    //GUI
    var gui = $('.powerGui');
    show ? gui.show() : gui.hide();
};

EnergyApp.prototype.onKeyDown = function(event) {
    //Do any base app key handling
    BaseApp.prototype.keydown.call(this, event);

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
    //Get associated group
    var occupyGroup = getOccupancyGroup(group);

    var occupyMaterial = new THREE.MeshLambertMaterial({color : 0x000066});
    var surplusMaterial = new THREE.MeshLambertMaterial({color : 0xffffff});

    var occupied = occupancy >= 0;

    //Display occupancy
    if(!occupied) {
        occupyGroup.traverse(function(obj) {
            if(obj instanceof THREE.Mesh) {
                obj.visible = false;
            }
        });
    } else {
        for(var i=0; i<maxOccupancy; ++i) {
            var child = occupyGroup.children[i];
            child.material = i<occupancy ? occupyMaterial : surplusMaterial;
            child.visible = true;
        }
    }
    var unknown = occupyGroup.getObjectByName('noData');
    if(unknown) {
        unknown.visible = !occupied;
    }
}

function hideGroup(group) {
    //Make all occupants of group invisible
    group.traverse(function(obj) {
        if(obj instanceof THREE.Mesh) {
            obj.visible = false;
        }
    });
}

function showGroup(group) {
    //Make all occupants of group visible
    group.traverse(function(obj) {
        if(obj instanceof THREE.Mesh) {
            obj.visible = true;
        }
    });
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
    //app.createGUI();

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
    $(".pure-checkbox").on('change', function(evt) {
        app.onPhaseSelect(evt.target.id);
    });
    $('.powerGui').hide();
    $(document).keydown(function (event) {
        app.onKeyDown(event);
    });
    app.run();
});
