let content = document.body.innerHTML;
let timeline = {};

//

let rootInfo = content.match(/#timeline +(?:from +|start +|begin +)?(\d+)\.(\d+)\.(\d+) +(?:(?:(?:to +|until +|end +|- +)(\d+)\.(\d+)\.(\d+))|(?:for +([\d\.]+) +(.+)|\(([\d\.]+)([a-z])\)))/);

let events   = [...content.matchAll(/^[*-~+] +(?:(.*) +\((?:([\d\.]+)([a-z])|(\d+)\.(?:(\d+)\.(?:(\d+))?)?)?(?: - (\d+)\.(?:(\d+)\.(?:(\d+))?)?| *(\d+):(\d+)(?: - (\d+):(\d+))?)?(?: ([\d\.]+)([a-z]))?\)(?: (?!\!)(\S+))?|(.+))((?: +\!.+)*)/gm)];

//

const RootInfo = {
    START_DAY:     1, START_MONTH:        2,  START_YEAR: 3,
    END_DAY:       4, END_MONTH:          5,  END_YEAR:   6,

    DURATION:      7, DURATION_ALT:       9,
    DURATION_UNIT: 8, DURATION_UNIT_ALT: 10
};

const EventInfo = {
    NAME: 1, NAME_ALT: 17,

    DURATION:      14, DURATION_ALT:      2,
    DURATION_UNIT: 15, DURATION_UNIT_ALT: 3,

    START_DAY:     4, START_MONTH:        5,  START_YEAR: 6,
    END_DAY:       7, END_MONTH:          8,  END_YEAR:   9,

    START_HOUR:   10, START_MINUTE:      11,
    END_HOUR:     12, END_MINUTE:        13,

    COLOR:        16,
    FLAGS:        18
};

//

function dateAddNOfUnit(date, n, unit)
{
    switch (unit[0])
    {
        case 'y':
        date.setHours(
            date.getHours() + 365 * 24 * n);
        break;

        case 'm':
        if (Math.floor(n) == n)
        {
            date.setMonth(
                date.getMonth() + n);
        }
        else
        {
            date.setHours(
                date.getHours() + 30.5 * 24 * n);
        }
        break;

        case 'w':
        date.setHours(
            date.getHours() + 7 * 24 * n);
        break;

        case 'd':
        date.setHours(
            date.getHours() + 24 * n);
        break;

        case 'h':
        date.setHours(
            date.getHours() + n);
        break;
    }
}

function shiftDependants(target, minutes)
{
    for (let dep of target.dependants)
    {
        dep.start = new Date(dep.start);
        dep.end = new Date(dep.end);

        dep.start.setMinutes(dep.start.getMinutes() + minutes);
        dep.end.setMinutes(dep.end.getMinutes() + minutes);

        if (dep.dependants)
        { shiftDependants(dep, minutes); }
    }
}

function pad(s, digits = 2, char = '0')
{
    s = s.toString();
    for (let i = s.length; i < digits; i++)
    {
        s = char + s;
    }
    return s;
}

timeline.start = new Date(rootInfo[RootInfo.START_YEAR] + '-' + pad(rootInfo[RootInfo.START_MONTH]) + '-' + pad(rootInfo[RootInfo.START_DAY]) + ' 00:00:00.000');

if (rootInfo[RootInfo.END_DAY])
{
    // End date given
    timeline.end = new Date(rootInfo[RootInfo.END_YEAR] + '-' + pad(rootInfo[RootInfo.END_MONTH]) + '-' + pad(rootInfo[RootInfo.END_DAY]) + ' 00:00:00.000')
}
else if (rootInfo[RootInfo.DURATION] || rootInfo[RootInfo.DURATION_ALT])
{
    // Duration given
    timeline.end = new Date(timeline.start);

    let duration = parseFloat(rootInfo[RootInfo.DURATION] || rootInfo[RootInfo.DURATION_ALT]);
    let durationUnit = rootInfo[RootInfo.DURATION_UNIT] || rootInfo[RootInfo.DURATION_UNIT_ALT];

    dateAddNOfUnit(timeline.end, duration, durationUnit);
}

timeline.duration = (timeline.end - timeline.start) / 3600000 / 24;

//

let datePrev = timeline.start;
let dateNext = timeline.start;
let lastEvent = {};
let colorNext = .6;

timeline.events = [];

for (let eventInfo of events)
{
    let event = {
        name: eventInfo[EventInfo.NAME] || eventInfo[EventInfo.NAME_ALT],
        color: eventInfo[EventInfo.COLOR]
    };

    if (eventInfo[EventInfo.START_DAY])
    {
        // Start date given
        let d = parseInt(eventInfo[EventInfo.START_DAY]);
        let m = parseInt(eventInfo[EventInfo.START_MONTH]) - 1 || datePrev.getMonth() + (d < datePrev.getDate());
        let y = parseInt(eventInfo[EventInfo.START_YEAR])      || datePrev.getFullYear() + (m < datePrev.getMonth());

        event.start = new Date("2000-01-01 00:00:00.000");
        event.start.setFullYear(y);
        event.start.setMonth(m);
        event.start.setDate(d);
    }
    else
    {
        event.start = new Date(dateNext);
        if (!lastEvent.dependants) { lastEvent.dependants = []; }

        lastEvent.dependants.push(event);

        if (eventInfo[EventInfo.DURATION] && eventInfo[EventInfo.DURATION_ALT])
        {
            // Start delay given (in fields DURATION[_UNIT]_ALT)
            let delay = eventInfo[EventInfo.DURATION_ALT];
            let delayUnit = eventInfo[EventInfo.DURATION_UNIT_ALT];
    
            dateAddNOfUnit(event.start, delay, delayUnit);
        }
    }

    if (eventInfo[EventInfo.END_DAY])
    {
        // End date given
        let d = parseInt(eventInfo[EventInfo.END_DAY]);
        let m = parseInt(eventInfo[EventInfo.END_MONTH]) - 1 || event.start.getMonth() + (d < event.start.getDate());
        let y = parseInt(eventInfo[EventInfo.END_YEAR])      || event.start.getFullYear() + (m < event.start.getMonth());

        event.end = new Date("2000-01-01 00:00:00.000");
        event.end.setFullYear(y);
        event.end.setMonth(m);
        event.end.setDate(d);
    }

    let duration = eventInfo[EventInfo.DURATION] || eventInfo[EventInfo.DURATION_ALT];
    let durationUnit = eventInfo[EventInfo.DURATION_UNIT] || eventInfo[EventInfo.DURATION_UNIT_ALT];

    if (eventInfo[EventInfo.START_HOUR])
    {
        // Start time given
        event.start.setHours(parseInt(eventInfo[EventInfo.START_HOUR]));
        event.start.setMinutes(parseInt(eventInfo[EventInfo.START_MINUTE]));

        if (!duration && !eventInfo[EventInfo.END_HOUR] && !event.end)
        {
            // Neither duration nor end date/time given
            duration = '1';
            durationUnit = 'h';
        }
    }

    if (eventInfo[EventInfo.END_HOUR])
    {
        // End time given
        event.end = new Date(event.start);
        event.end.setHours(parseInt(eventInfo[EventInfo.END_HOUR]));
        event.end.setMinutes(parseInt(eventInfo[EventInfo.END_MINUTE]));
    }

    if (duration)
    {
        // Duration given
        event.end = new Date(event.start);
        duration = parseFloat(duration);

        dateAddNOfUnit(event.end, duration, durationUnit);
    }

    if (!event.end)
    {
        event.end = new Date(event.start)
        event.end.setDate(event.end.getDate() + 1);
    }

    if (!event.color)
    {
        event.color = 'hsl(' + colorNext * 360 + ', 90%, 50%)';
    }

    colorNext += 0.35;
    if (colorNext > 1)
    { colorNext -= 0; }
    
    event.duration = (event.end - event.start) / 3600000 / 24;

    event.flags = eventInfo[EventInfo.FLAGS] ?
                  eventInfo[EventInfo.FLAGS].split(' !').slice(1) :
                  [];
    
    if (event.flags.indexOf('solo') >= 0)
    {
        // Split previous overlapping events
        for (let i = 0; i < timeline.events.length; i++)
        {
            let other = timeline.events[i];

            if (event.start >= other.start && event.start < other.end
             && !(other.flags && other.flags.indexOf('solo') >= 0))
            {
                let clone = JSON.parse(JSON.stringify(other));
                other.end = event.start;
                other.duration = (other.end - other.start) / 3600000 / 24;

                clone.start = event.end;
                clone.end = new Date(clone.end);
                clone.end.setMinutes(clone.end.getMinutes() + (event.end - event.start) / 60000);

                clone.dependants = other.dependants || [];
                other.dependants = [];

                shiftDependants(clone, (event.end - event.start) / 60000);

                clone.duration = (clone.end - clone.start) / 3600000 / 24;
                clone.flags.push('_part');

                //

                timeline.events.splice(i + 1, 0, clone);
                other.dependants.push(clone);

                if (!event.virtualLayerSources) { event.virtualLayerSources = []; }
                event.virtualLayerSources.push(other);
            }
        }
    }

    //

    timeline.events.push(event);
    dateNext = event.end;
    datePrev = event.start;

    lastEvent = event;
}

let html = '<div class="timelinew"><div class="timeline" id="el_timeline">';

// Render weeks
for (let date = new Date(timeline.start); date <= timeline.end; date.setDate(date.getDate() + 1))
{
    if (date.getDay() == 1 || date - timeline.start == 0 || date - timeline.end == 0)
    {
        // Visualize week beginnings, start and end of the timeline
        html += '<span class="bar' + (date - timeline.end == 0 ? ' top' : '') + '" style="'
             +  'top: ' + (date - timeline.start) / 36000 / 24 / timeline.duration + '%'
             +  '">' + date.getDate() + '.' + (date.getMonth() + 1) + '.</span>';
    }
}

// Render 'now' and 'today' indicators
let now = new Date();
let today = new Date(now);
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);

html += '<div class="today" id="el_today" style="'
     +  'top: ' + (today - timeline.start) / 36000 / 24 / timeline.duration + '%'
     +  '"></div>';

html += '<span class="bar-now" id="el_now" style="'
     +  'top: ' + (now - timeline.start) / 36000 / 24 / timeline.duration + '%'
     +  '"></span>';

let j = 0;
let layers = 0;

// Render events
for (let event of timeline.events)
{
    let layer = 0;

    let isPart = event.flags.indexOf('_part') >= 0;

    if (isPart)
    {
        layer = timeline.events[j-1].layer;
    }
    else
    {
        for (let vls of (event.virtualLayerSources || []))
        {
            if (vls.layer == layer)
            { layer++; }
        }

        for (let i = 0; i < j; i++)
        {
            let other = timeline.events[i];

            if (
                (other.layer == layer
             || (other.layer > layer && other.flags.indexOf('solo') >= 0)
             ) && (
                (event.start >= other.start && event.start < other.end)
             || (other.start >= event.start && other.start < event.end)
            ))
            { layer = other.layer + 1; }
        }
    }

    event.layer = layer;

    html += '<span class="event'
         +  (isPart ? ' part' : '')
         + '" style="'
         +  'top: ' + (event.start - timeline.start) / 36000 / 24 / timeline.duration + '%; '
         +  'height: ' + (event.duration * 100 / timeline.duration) + '%; '
         +  '--layer: ' + layer + ';'
         +  (layer ? '' : '--label-shift: none;')
         +  'background-color: ' + event.color + ';'
         +  'color: ' + event.color
         +  '" title="' + event.name + '"></span>';

    if (layer > layers)
    { layers = layer; }

    j++;
}

html += '</div></div>'

html += css();

document.body.innerHTML = html;

//

var zoom = window.localStorage.getItem('zoom') || 3;
var updateDBtout = null;

el_timeline.style.setProperty('--label-shift', layers);
el_timeline.style.setProperty('--duration', timeline.duration);
el_timeline.style.setProperty('--day-width', zoom + 'vw');

setTimeout(() =>
el_timeline.parentNode.scroll({
    top: parseInt(window.localStorage.getItem('x')),
    behaviour: 'auto'
}),1);

document.body.addEventListener("wheel", (e) => {
    let bcr = el_timeline.getBoundingClientRect();
    if (e.getModifierState('Shift'))
    {
        let oldZoom = zoom
        zoom = Math.min(timeline.duration / 7, Math.max(1, zoom - zoom * e.deltaY / 300));
        el_timeline.style.setProperty('--day-width', zoom + 'vw');

        el_timeline.parentNode.scrollBy({
            top: (zoom - oldZoom) * (e.x + bcr.x / bcr.width * (zoom - oldZoom > 0 ? 1 : -1)),
            behaviour: 'auto'
        })
    }
    if (updateDBtout)
    { clearTimeout(updateDBtout); updateDBtout = null; }

    updateDBtout = setTimeout(() => {
        updateDBtout = null;
        window.localStorage.setItem('zoom', zoom);
        window.localStorage.setItem('x', el_timeline.parentNode.scrollTop);
    }, 200);
});

// Every 5 minutes
setInterval(() =>
{
    let now = new Date();
    let today = new Date(now);
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    el_today.style.top = (today - timeline.start) / 36000 / 24 / timeline.duration + '%';
    el_now.style.top = (now - timeline.start) / 36000 / 24 / timeline.duration + '%';
}, 300000);

function css()
{
    return "<style>\
:root\
{\
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\
    font-size: 10pt;\
}\
body\
{\
    margin: 0;\
}\
.timelinew\
{\
    position: absolute;\
    display: block;\
    transform:rotate(-90deg);\
    transform-origin: right top;\
    width: 100vh;\
    height: calc(100vw);\
    left: -100vh;\
\
    overflow-x: hidden;\
    overflow-y: scroll;\
\
    direction: rtl;\
}\
.timeline\
{\
    right:calc(6 * 12px);\
    position: relative;\
    width:12px;\
    height: calc(var(--duration) * var(--day-width));\
    background: repeating-linear-gradient(0deg, rgba(114,114,114,.15), rgba(114,114,114,.15) var(--day-width), rgba(114,114,114,.07) var(--day-width), rgba(114,114,114,.07) calc(var(--day-width) * 2));\
    background-position: 0 -1px;\
\
    --day-width: 3vw;\
\
    direction: ltr;\
}\
.event\
{\
    position: absolute;\
\
    border-radius: 2px;\
    right: calc(var(--layer) * 130%);\
    width:100%;\
    writing-mode: vertical-rl;\
}\
.event:after\
{\
    content: attr(title);\
    position: absolute;\
\
    right: calc(130% * var(--layer) * (var(--label-shift)));\
    left: 100%;\
}\
.event.part:after\
{\
    content: '';\
}\
.bar\
{\
    position: absolute;\
\
    padding-top: 4px;\
\
    border-top: 2px solid rgba(96,96,96,.14);\
    color: rgba(127,127,127,.9);\
    right: calc(130% * -4);\
    transform: translateX(-2px) translateY(-1px);\
    width: 80vh;\
\
    writing-mode: vertical-rl;\
}\
.bar.left\
{\
    text-align: right;\
    padding-top: 0px;\
    padding-bottom: 4px;\
\
    transform: translateX(-100%);\
    border: none;\
    border-bottom: 2px solid rgba(96,96,96,.14);\
}\
.bar-now\
{\
    position: absolute;\
\
    padding-top: 4px;\
\
    border-top: 1px solid red;\
    right: calc(130% * -2);\
    transform: translateX(-2px);\
    width: calc(80vh - 130% * 2);\
}\
.vscode-dark .bar-now\
{\
    border-top-color: #c24;\
}\
.today\
{\
    position: absolute;\
\
    background-color: rgba(154,154,154,.1);\
    height: var(--day-width);\
    right: calc(130% * -2);\
    transform: translateX(-2px);\
    transition: .4s top ease-in-out;\
    width: calc(80vh - 130% * 2);\
}\
</style>";
}
