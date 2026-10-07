import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui';

const juniorLessons = [
  ['Monday', 'Gaithersburg High School', '7:30 PM–9:00 PM'],
  ['Wednesday', 'Gaithersburg High School', '7:30 PM–9:00 PM'],
  [
    'Saturday',
    'Richard Montgomery High School',
    '5:00 PM–7:00 PM or 5:00 PM–8:00 PM'
  ],
  ['Sunday', 'Richard Montgomery High School', '3:00 PM–5:00 PM']
];

export default function Training() {
  return (
    <>
      <section className="section training-page">
        <div className="page-heading">
          <span className="eyebrow">LEARN. PRACTICE. PLAY.</span>
          <h1>Training Programs</h1>
          <p>
            Group lessons for junior and adult players,
            plus private coaching by arrangement.
          </p>
        </div>

        <div className="training-archive">
          <span className="tag">
            2017–2018 winter program · Archive
          </span>
          <p>
            This is the club’s historical winter training schedule.
            Contact the club to confirm current programs, times, and locations.
          </p>
        </div>

        <section className="training-block">
          <span className="eyebrow">
            JUNIOR GROUP LESSONS · AGES 6–18
          </span>

          <h2>
            2017–2018 Winter<br />
            Junior Group Lessons
          </h2>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {juniorLessons.map(([day, location, time]) => (
                <TableRow key={day}>
                  <TableCell>{day}</TableCell>
                  <TableCell>{location}</TableCell>
                  <TableCell>{time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="training-block">
          <span className="eyebrow">ADULT GROUP LESSONS</span>

          <h2>
            2017–2018 Winter<br />
            Adult Group Lessons
          </h2>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow>
                <TableCell>Wednesday</TableCell>
                <TableCell>Gaithersburg High School</TableCell>
                <TableCell>7:30 PM–9:30 PM</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <p className="fineprint">
          All dates, times, and locations are subject to change without notice
          on the website. Contact the club for training dates, cancellations,
          and registration.
        </p>
      </section>

      <section className="section play">
        <div>
          <span className="eyebrow">PRIVATE COACHING</span>
          <h2>A lesson for<br />your game.</h2>
          <p>
            Private lessons are available by arrangement.
            Contact Coach Yeping to discuss availability and choose a lesson time.
          </p>
        </div>

        <div className="training-contact">
          <h3>Questions or registration?</h3>
          <p>
            Call or email the club for current training details
            and to register your interest.
          </p>

          <a className="button dark" href="tel:+12023908988">
            Call (202) 390-8988
          </a>

          <a
            className="training-email"
            href="mailto:info@eastcoastbadmintonclub.com?subject=Training%20program%20inquiry"
          >
            info@eastcoastbadmintonclub.com
          </a>

          <a className="underlined" href="/calendar">
            See the current open gym calendar
          </a>
        </div>
      </section>
    </>
  );
}
