let content = document.body.innerHTML;
let timeline = {};

//

let rootInfo = content.match(/#timeline +(?:from +|start +|begin +)?(\d+)\.(\d+)\.(\d+) +(?:(?:(?:to +|until +|end +|- +)(\d+)\.(\d+)\.(\d+))|(?:for +([\d\.]+) +(.+)|\(([\d\.]+)([a-z])\)))/);

let events   = [...content.matchAll(/^[*-~+] +(?:(.*) +\((?:([\d\.]+)([a-z])|(\d+)\.(?:(\d+)\.(?:(\d+))?)?)?(?: - (\d+)\.(?:(\d+)\.(?:(\d+))?)?| *(\d+):(\d+)(?: - (\d+):(\d+))?)?(?: ([\d\.]+)([a-z]))?\)(?: (\S+))?|(.+))/gm)];

//

const RootInfo = {
    START_DAY:     1, START_MONTH:        2,  START_YEAR: 3,
    END_DAY:       4, END_MONTH:          5,  END_YEAR:   6,

    DURATION:      7, DURATION_ALT:       9,
    DURATION_UNIT: 8, DURATION_UNIT_ALT: 10
};

const EventInfo = {
    NAME: 1, NAME_ALT: 14,

    DURATION:      2, DURATION_ALT:      14,
    DURATION_UNIT: 3, DURATION_UNIT_ALT: 15,

    START_DAY:     4, START_MONTH:        5,  START_YEAR: 6,
    END_DAY:       7, END_MONTH:          8,  END_YEAR:   9,

    START_HOUR:   10, START_MINUTE:      11,
    END_HOUR:     12, END_MINUTE:        13,

    COLOR:        16
};

//

function pad(s, digits = 2, char = '0')
{
    s = s.toString();
    for (let i = s.length; i < digits; i++)
    {
        s = char + s;
    }
    return s;
}

timeline.start = new Date(rootInfo[RootInfo.START_YEAR] + '-' + pad(rootInfo[RootInfo.START_MONTH]) + '-' + pad(rootInfo[RootInfo.START_DAY]));

if (rootInfo[RootInfo.END_DAY])
{
    // End date given
    timeline.end = new Date(rootInfo[RootInfo.END_YEAR] + '-' + pad(rootInfo[RootInfo.END_MONTH]) + '-' + pad(rootInfo[RootInfo.END_DAY]))
}
else if (rootInfo[RootInfo.DURATION] || rootInfo[RootInfo.DURATION_ALT])
{
    // Duration given
    timeline.end = new Date(timeline.start);

    let duration = parseFloat(rootInfo[RootInfo.DURATION] || rootInfo[RootInfo.DURATION_ALT]);
    let durationUnit = rootInfo[RootInfo.DURATION_UNIT] || rootInfo[RootInfo.DURATION_UNIT_ALT];

    switch (durationUnit[0])
    {
        case 'y':
        timeline.end.setUTCHours(
            timeline.end.getUTCHours() + 365 * 24 * duration);
        break;

        case 'm':
        if (Math.floor(duration) == duration)
        {
            timeline.end.setUTCMonth(
                timeline.end.getUTCMonth() + duration);
        }
        else
        {
            timeline.end.setUTCHours(
                timeline.end.getUTCHours() + 30.5 * 24 * duration);
        }
        break;

        case 'w':
        timeline.end.setUTCHours(
            timeline.end.getUTCHours() + 7 * 24 * duration);
        break;

        case 'd':
        timeline.end.setUTCHours(
            timeline.end.getUTCHours() + 24 * duration);
        break;

        case 'h':
        timeline.end.setUTCHours(
            timeline.end.getUTCHours() + duration);
        break;
    }
}

timeline.duration = (timeline.end - timeline.start) / 3600000 / 24;

//

let datePrev = timeline.start;
let dateNext = timeline.start;
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
        let m = parseInt(eventInfo[EventInfo.START_MONTH]) - 1 || datePrev.getUTCMonth() + (d < datePrev.getUTCDate());
        let y = parseInt(eventInfo[EventInfo.START_YEAR])      || datePrev.getUTCFullYear() + (m < datePrev.getUTCMonth());

        event.start = new Date("2000-01-01 00:00:00.000");
        event.start.setFullYear(y);
        event.start.setMonth(m);
        event.start.setDate(d);
    }
    else
    {
        event.start = dateNext;
    }

    if (eventInfo[EventInfo.END_DAY])
    {
        // End date given
        let d = parseInt(eventInfo[EventInfo.END_DAY]);
        let m = parseInt(eventInfo[EventInfo.END_MONTH]) - 1 || event.start.getUTCMonth() + (d < event.start.getUTCDate());
        let y = parseInt(eventInfo[EventInfo.END_YEAR])      || event.start.getUTCFullYear() + (m < event.start.getUTCMonth());

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
        event.start.setUTCHours(parseInt(eventInfo[EventInfo.START_HOUR]));
        event.start.setUTCMinutes(parseInt(eventInfo[EventInfo.START_MINUTE]));

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
        event.end.setUTCHours(parseInt(eventInfo[EventInfo.END_HOUR]));
        event.end.setUTCMinutes(parseInt(eventInfo[EventInfo.END_MINUTE]));
    }

    if (duration)
    {
        // Duration given
        event.end = new Date(event.start);

        duration = parseFloat(duration);
        switch (durationUnit[0])
        {
            case 'y':
            event.end.setUTCHours(
                event.end.getUTCHours() + 365 * 24 * duration);
            break;

            case 'm':
            if (Math.floor(duration) == duration)
            {
                event.end.setUTCMonth(
                    event.end.getUTCMonth() + duration);
            }
            else
            {
                event.end.setUTCHours(
                    event.end.getUTCHours() + 30.5 * 24 * duration);
            }
            break;

            case 'w':
            event.end.setUTCHours(
                event.end.getUTCHours() + 7 * 24 * duration);
            break;

            case 'd':
            event.end.setUTCHours(
                event.end.getUTCHours() + 24 * duration);
            break;

            case 'h':
            event.end.setUTCHours(
                event.end.getUTCHours() + duration);
            break;
        }
    }

    if (!event.end)
    {
        event.end = new Date(event.start)
        event.end.setUTCDate(event.end.getUTCDate() + 1);
    }

    if (!event.color)
    {
        event.color = 'hsl(' + colorNext * 360 + ', 90%, 50%)';
    }

    colorNext += 0.35;
    if (colorNext > 1)
    { colorNext -= 0; }
    
    event.duration = (event.end - event.start) / 3600000 / 24;

    //

    timeline.events.push(event);
    dateNext = event.end;
    datePrev = event.start;
}

let html = '<div class="timelinew"><div class="timeline" id="el_timeline">';

//html += '<pre>'+JSON.stringify(timeline.events, null, '  ')+'</pre>';

/*for (let i in events[0])
{ html += i + ': ' + events[0][i] + '</br>'; }*/

let j = 0;
let layers = 0;

// Render weeks
for (let date = new Date(timeline.start); date <= timeline.end; date.setUTCDate(date.getUTCDate() + 1))
{
    if (date.getDay() == 1 || date - timeline.start == 0 || date - timeline.end == 0)
    {
        // Visualize week beginnings, start and end of the timeline
        html += '<span class="bar' + (date - timeline.end == 0 ? ' top' : '') + '" style="'
             +  'top: ' + (date - timeline.start) / 36000 / 24 / timeline.duration + '%'
             +  '">' + date.getDate() + '.' + (date.getMonth() + 1) + '.</span>';
    }
}

// Render events
for (let event of timeline.events)
{
    let layer = 0;

    for (let i = 0; i < j; i++)
    {
        let other = timeline.events[i];

        if (other.layer == layer
         && (
            (event.start >= other.start && event.start < other.end)
         || (other.start >= event.start && other.start < event.end)
         ))
        { layer++; }
    }

    event.layer = layer;

    html += '<span class="event" style="'
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
.bar\
{\
    position: absolute;\
\
    padding-top: 4px;\
\
    border-top: 2px solid rgba(96,96,96,.14);\
    color: rgba(127,127,127,.9);\
    right: calc(130% * -4);\
    transform: translateX(-2px);\
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
</style>";
}
