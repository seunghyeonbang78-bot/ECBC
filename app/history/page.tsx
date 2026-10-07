export default function History() {
  return (
    <>
      <section className="section history-intro">
        <span className="eyebrow">
          ROOTED IN MARYLAND. BUILT AROUND BADMINTON.
        </span>

        <h1>Our club.<br />Our shared history.</h1>

        <p>
          Founded in 2010, East Coast Badminton Club grew through open tournaments,
          open gym, and coaching for players of different ages and abilities.
        </p>

        <img
          className="history-photo"
          src="/assets/court.jpg"
          alt="Players competing in the 2012 ECBC Yonex Open tournament"
        />

        <p className="photo-credit">
          ECBC Yonex Open, 2012 · Photo: Peter Teuben
        </p>
      </section>

      <section className="section history-grid">
        <div>
          <span className="eyebrow">THE EARLY YEARS</span>
          <h2>A place for the<br />badminton community.</h2>
        </div>

        <div>
          <p>
            An archived Northeast Badminton profile places the club’s beginnings
            in Rockville, Maryland in 2010. It describes a club built around
            training, competition, and the chance to enjoy the game together.
          </p>

          <p>
            Founder and coach Yeping Tang brought international playing experience
            to the program. The early profile also records coaching contributions
            from Vincent Nguy, a U.S. National Team member, and Malik Basri,
            a former Singapore National Team member. These are historical records,
            not a current coaching roster.
          </p>

          <p>
            From adult group classes to individual coaching and competitive
            training, the club’s early programs welcomed different reasons for
            playing: exercise, community, skill development, and tournament
            preparation.
          </p>

          <a
            className="underlined"
            href="/assets/ecbc-history.pdf"
            target="_blank"
            rel="noopener"
          >
            Read the original club profile (PDF)
          </a>
        </div>
      </section>

      <section className="section timeline-section">
        <span className="eyebrow">TOURNAMENT HERITAGE</span>
        <h2>Years of shared rallies.</h2>

        <div className="timeline">
          <article>
            <strong>2010</strong>
            <h3>The beginning</h3>
            <p>
              ECBC was founded. The club’s photo archive records
              an ECBC Yonex Open tournament that year.
            </p>
          </article>

          <article>
            <strong>2011</strong>
            <h3>The tradition continues</h3>
            <p>
              The original website includes a second year
              of ECBC Yonex Open tournament photographs.
            </p>
          </article>

          <article>
            <strong>2012</strong>
            <h3>Moments on court</h3>
            <p>
              Another tournament gallery preserved the competition,
              with photographs credited to Peter Teuben.
            </p>
          </article>
        </div>
      </section>

      <section className="section club">
        <span className="eyebrow">THE GAME BRINGS US TOGETHER</span>
        <h2>Be part of the next chapter.</h2>
        <p>
          Find a session, explore training, and stay connected with the club.
        </p>

        <div className="actions">
          <a className="button lime" href="/calendar">
            View the calendar
          </a>
          <a className="text-link" href="/news">
            Read club news
          </a>
        </div>
      </section>
    </>
  );
}
