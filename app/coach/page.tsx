import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui';

const results = [
  ['2000', 'U.S. Adult Nationals', 'Singles', '1st'],
  ['1999', 'U.S. Adult Nationals', 'Singles, doubles, mixed doubles', '1st in all three'],
  ['1998', 'U.S. Adult Nationals', 'Singles, doubles, mixed doubles', '1st in all three'],
  ['1997', 'U.S. Adult Nationals', 'Doubles / singles', '1st / 2nd'],
  ['1996', 'U.S. Adult Nationals', 'Singles, mixed doubles / doubles', '1st / 2nd'],
  ['1999', 'Pan American Games · Winnipeg', 'Singles / mixed doubles', 'Gold / bronze'],
  ['1999', 'U.S. Open · Orange County', 'Singles / mixed doubles', '1st / 2nd'],
  ['1987', 'World Junior Championships · Jakarta', 'Doubles', '3rd'],
  ['1987', 'All China Junior Nationals', 'Singles', '2nd']
];

export default function Coach() {
  return (
    <>
      <section className="section coach">
        <div className="coach-image">
          <img
            src="/assets/coach.jpg"
            alt="Yeping Tang, ECBC founder and coach"
          />
          <span>ECBC FOUNDER & COACH</span>
        </div>

        <div className="coach-copy">
          <span className="eyebrow">
            THE EXPERIENCE BEHIND YOUR GAME
          </span>
          <h1>Yeping Tang</h1>
          <p>
            A playing career across national and international competition,
            followed by a commitment to sharing the game.
          </p>
          <p>
            Tang’s results include U.S. national titles,
            Pan American Games singles gold, and the U.S. Open singles title.
            After her competitive career, she turned her focus to coaching at ECBC.
          </p>
          <a href="tel:+12023908988" className="button dark">
            Ask about coaching
          </a>
        </div>
      </section>

      <section className="section results-section">
        <span className="eyebrow">CAREER HIGHLIGHTS</span>
        <h2>A record of achievement.</h2>

        <Table>
          <TableHeader>
            <TableRow>
              {['Year', 'Competition', 'Discipline', 'Result'].map(title => (
                <TableHead key={title}>{title}</TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {results.map((row, index) => (
              <TableRow key={index}>
                {row.map((value, column) => (
                  <TableCell key={column}>{value}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="fineprint">
          Historical results transcribed from ECBC’s original coach profile.
          U.S. national events listed were held in Orange County, California,
          except 1997 in Atlanta, Georgia.
        </p>
      </section>

      <section className="section play">
        <div>
          <span className="eyebrow">FROM EXPERIENCE TO PRACTICE</span>
          <h2>Build your game.</h2>
        </div>

        <div>
          <p>
            The club’s historical profile describes training through repetition,
            targeted drills, and instructor demonstrations. Group and private
            lessons have served players learning foundational strokes and
            strategies, as well as players preparing for competition.
          </p>
          <p>
            Contact Coach Yeping for current lesson formats and availability.
          </p>
          <a className="button dark" href="/#contact">
            Contact the club
          </a>
        </div>
      </section>
    </>
  );
}
